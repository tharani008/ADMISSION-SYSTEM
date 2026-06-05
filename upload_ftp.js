const ftp = require("basic-ftp");
const fs = require("fs");
const path = require("path");

const FTP_CONFIG = {
    host: "153.92.8.168",
    user: "u681419788.admission.lasakedu.in",
    password: "Admission@2026lasak",
    secure: false
};

// Files/folders to exclude from server upload
const EXCLUDE = [
    "vendor",
    "node_modules",
    "client",
    "enrolled",
    "server",
    "functions",
    ".git",
    ".github",
    ".firebase",
    ".firebaserc",
    "firebase.json",
    "firebase_sites.json",
    "sites_final.json",
    "sites_final_2.json",
    "sites_final_3.json",
    "functions_after_term.json",
    "functions_final_check.json",
    "functions_list.json",
    "functions_mid_check.json",
    "deployment_packages",
    "Hostinger_Backend.zip",
    "Hostinger_Frontend.zip",
    "dist.zip",
    "ecosystem.config.cjs",
    "package.json",
    "package-lock.json",
    "vps-setup.sh",
    "nginx.conf",
    "nginx_dump.txt",
    "logs.json",
    "func.log",
    "tmp.log",
    "push_out.txt",
    "push_error.txt",
    "push_err.txt",
    "dig_out.txt",
    "curl_out.txt",
    "curl_out2.txt",
    "certbot_out.txt",
    "certbot_log2.txt",
    "certbot_log3.txt",
    "diff.txt",
    "diff_utf8.txt",
    "test_certificate.pdf",
    "composer.phar",
    "cacert.pem",
    "cacert_combined.pem",
    "test_curl.php"
];

async function uploadDir(client, localDir, remoteDir) {
    const items = fs.readdirSync(localDir);
    
    try {
        await client.ensureDir(remoteDir);
    } catch (e) {
        // dir may already exist
    }

    for (const item of items) {
        const localPath = path.join(localDir, item);
        const remotePath = remoteDir + "/" + item;
        const stat = fs.statSync(localPath);

        if (EXCLUDE.includes(item)) {
            continue;
        }

        if (stat.isDirectory()) {
            console.log(`  Entering dir: ${remotePath}`);
            await uploadDir(client, localPath, remotePath);
        } else {
            console.log(`  Uploading: ${remotePath}`);
            await client.uploadFrom(localPath, remotePath);
        }
    }
}

async function deploy() {
    const client = new ftp.Client();
    client.ftp.verbose = false;

    try {
        console.log("Connecting to Hostinger FTP...");
        await client.access(FTP_CONFIG);
        client.ftp.socket.setTimeout(90000); // Increase timeout to 90s for vendor files
        console.log("Connected!\n");

        console.log("=== STEP 1: Cleaning and preparing /public_html ===");
        await client.ensureDir("/public_html");
        
        console.log("=== STEP 2: Uploading Monolithic PHP files ===");
        const rootDir = __dirname;
        const items = fs.readdirSync(rootDir);

        for (const item of items) {
            if (EXCLUDE.includes(item) || item === "upload_ftp.js") {
                continue;
            }

            const localPath = path.join(rootDir, item);
            const stat = fs.statSync(localPath);

            if (stat.isDirectory()) {
                console.log(`Uploading dir: ${item}`);
                await uploadDir(client, localPath, "/public_html/" + item);
            } else {
                console.log(`Uploading file: ${item}`);
                await client.uploadFrom(localPath, "/public_html/" + item);
            }
        }
        
        console.log("\n=== DEPLOYMENT SUCCESSFUL ===");
        console.log("PHP Monolith is now live at: https://admission.lasakedu.in");

    } catch (err) {
        console.error("Error during deployment:", err);
    }

    client.close();
}

deploy();
