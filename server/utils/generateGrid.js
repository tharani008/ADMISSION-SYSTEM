const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const generateGrid = () => {
    const doc = new PDFDocument({
        size: [1414, 2000],
        margin: 0
    });

    const outputPath = path.join(__dirname, '..', 'alignment_grid.pdf');
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // 1. Draw Template
    const assetsDir = path.join(__dirname, '..', 'assets');
    const templatePath = path.join(assetsDir, 'course template (1).png');
    if (fs.existsSync(templatePath)) {
        doc.image(templatePath, 0, 0, { width: 1414, height: 2000 });
    }

    // 2. Draw Grid
    doc.lineWidth(1);
    doc.fontSize(10);
    doc.fillColor('red');
    doc.strokeColor('red');
    doc.opacity(0.5);

    // Vertical lines (X)
    for (let x = 0; x <= 1414; x += 50) {
        doc.moveTo(x, 0).lineTo(x, 2000).stroke();
        doc.text(x.toString(), x + 2, 20); // Top label
        doc.text(x.toString(), x + 2, 1000); // Middle label
    }

    // Horizontal lines (Y)
    for (let y = 0; y <= 2000; y += 50) {
        doc.moveTo(0, y).lineTo(1414, y).stroke();
        doc.text(y.toString(), 20, y + 2); // Left label
        doc.text(y.toString(), 700, y + 2); // Center label
    }

    // 3. Draw Sample Text Placeholders (To see where they land)
    doc.opacity(1.0);
    doc.fillColor('blue');
    doc.fontSize(28); // Standard size

    // Helper to draw a box and label
    const drawBox = (label, x, y) => {
        doc.circle(x, y, 5).fill('blue');
        doc.text(label, x + 10, y - 10);
        doc.text(`(${x}, ${y})`, x + 10, y + 20);
    };

    drawBox("Admission (Start)", 480, 940);
    drawBox("Certificate (Start)", 1000, 940);
    drawBox("Name (Start)", 550, 1040);
    drawBox("Course (Start)", 550, 1140);
    drawBox("Date (Start)", 550, 1240);

    doc.end();
    console.log('Grid PDF created at:', outputPath);
};

generateGrid();
