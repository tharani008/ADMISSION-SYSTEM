import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
const logo = '/logo.png';

// Helper to fetch image and convert to base64
const fetchImage = async (url) => {
    if (!url) return null;
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Error fetching image:', error);
        return null;
    }
};

export const generateApplicationPDF = async (application) => {
    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;

        // Header
        const primColor = [63, 81, 181]; // Indigo 500
        const secColor = [240, 240, 240]; // Light Gray

        // Application Status Badge Color
        let statusColor = [100, 100, 100];
        if (application.status === 'Enrolled') statusColor = [0, 128, 0];
        if (application.status === 'Rejected') statusColor = [200, 0, 0];
        if (application.status === 'New') statusColor = [0, 0, 200];

        // --- Header Section ---
        doc.setFillColor(...primColor);
        doc.rect(0, 0, pageWidth, 40, 'F');

        // Logo
        const logoBase64 = await fetchImage(logo);
        if (logoBase64) {
            doc.addImage(logoBase64, 'PNG', 15, 5, 25, 30); // Adjust dimensions/position as needed
        }

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('ADMISSION APPLICATION', 45, 20); // Shifted right to accommodate logo

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Application ID: ${application.application_id}`, 45, 30); // Shifted right

        // Date generated
        const today = new Date().toLocaleDateString();
        doc.text(`Date: ${today}`, pageWidth - 15, 30, { align: 'right' });

        // --- Photo Section ---
        let photoBase64 = null;
        if (application.photo_url) {
            photoBase64 = await fetchImage(application.photo_url);
            if (photoBase64) {
                // Add photo to header (Top Right, slightly below title)
                // x, y, w, h
                const imgWidth = 30;
                const imgHeight = 40;
                try {
                    // Let jsPDF detect format from data URL
                    doc.addImage(photoBase64, pageWidth - 50, 45, imgWidth, imgHeight);
                } catch (e) {
                    console.error("Error adding photo image", e);
                    doc.setFontSize(8);
                    doc.text("(Photo Error)", pageWidth - 50, 55);
                }
            }
        }

        // --- Metadata / Status ---
        let yPos = 50;

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 15, yPos);

        doc.setFontSize(14);
        doc.setTextColor(...statusColor);
        doc.setFont('helvetica', 'bold');
        // If photo exists, status text might overlap if not moved
        // Let's place status on the left or under the generated date
        doc.text(`Status: ${application.status}`, 15, yPos + 10);

        yPos += 20;

        // If photo was added, ensure we don't overlap with the next table
        // Photo spans roughly 45 to 85.
        // Let's start tables after enough space.
        if (photoBase64 && yPos < 90) {
            yPos = 90;
        } else if (yPos < 70) {
            yPos = 70;
        }

        // --- Personal Information ---
        autoTable(doc, {
            startY: yPos,
            head: [['Personal Information', '']],
            body: [
                ['Full Name', application.student_name || 'N/A'],
                ['Date of Birth', application.dob || 'N/A'],
                ['Gender', application.gender || 'N/A'],
                ['Phone', application.phone || 'N/A'],
                ['Email', application.email || 'N/A'],
                ['Address', application.address || 'N/A'],
                ['College/Company', application.college_company || 'N/A']
            ],
            theme: 'grid',
            headStyles: { fillColor: primColor, textColor: 255, fontSize: 12 },
            styles: { fontSize: 10, cellPadding: 3 },
            columnStyles: { 0: { fontStyle: 'bold', width: 60 } }
        });

        yPos = doc.lastAutoTable.finalY + 10;

        // --- Course Information ---
        autoTable(doc, {
            startY: yPos,
            head: [['Academic Details', '']],
            body: [
                ['Course', application.course || 'N/A'],
                ['Course Start Date', application.course_start_date || 'N/A'],
                ['Course End Date', application.course_end_date || 'N/A']
            ],
            theme: 'grid',
            headStyles: { fillColor: primColor, textColor: 255, fontSize: 12 },
            styles: { fontSize: 10, cellPadding: 3 },
            columnStyles: { 0: { fontStyle: 'bold', width: 60 } }
        });

        yPos = doc.lastAutoTable.finalY + 10;

        // --- Fee & Payment Information ---

        // Calculations
        const totalFee = parseFloat(application.fee_total || 0);
        const discountAmount = parseFloat(application.fee_discount_amount || 0);
        const finalFee = application.is_scholarship ? (totalFee - discountAmount) : totalFee;
        const amountPaid = parseFloat(application.payment_amount || 0);
        const balanceDue = finalFee - amountPaid;

        const feeBody = [
            ['Total Course Fee', `Rs. ${totalFee.toFixed(2)}`]
        ];

        if (application.is_scholarship) {
            feeBody.push(['Scholarship Applied', `${application.scholarship_percent}%`]);
            feeBody.push(['Discount Amount', `- Rs. ${discountAmount.toFixed(2)}`]);
            feeBody.push(['Final Fee (After Discount)', `Rs. ${finalFee.toFixed(2)}`]);
        }

        feeBody.push(['Payment Status', application.payment_status || 'Pending']);
        feeBody.push(['Amount Paid', `Rs. ${amountPaid.toFixed(2)}`]);
        if (application.penalty_amount > 0) {
            feeBody.push(['Penalty Amount', `+ Rs. ${parseFloat(application.penalty_amount).toFixed(2)}`]);
        }
        feeBody.push(['Balance Due', `Rs. ${balanceDue.toFixed(2)}`]);
        feeBody.push(['Payment Type', application.payment_type || 'N/A']);
        if (application.payment_type === 'Installment' || ['EMI', 'Bajaj', 'Flashaid', 'Fibe'].includes(application.payment_type)) {
            const label = application.payment_type === 'Installment' ? 'Installments Count' : 'EMI Months';
            feeBody.push([label, application.installments_count || 'N/A']);
        }
        feeBody.push(['Payment Method', application.payment_method || 'N/A']);
        feeBody.push(['Scheduled Date', application.payment_date ? new Date(application.payment_date).toLocaleDateString() : 'N/A']);
        feeBody.push(['Last Date (Due Date)', application.payment_last_date ? new Date(application.payment_last_date).toLocaleDateString() : 'N/A']);
        feeBody.push(['Transaction ID', application.payment_transaction_id || 'N/A']);

        autoTable(doc, {
            startY: yPos,
            head: [['Fee & Payment Details', '']],
            body: feeBody,
            theme: 'grid',
            headStyles: { fillColor: primColor, textColor: 255, fontSize: 12 },
            styles: { fontSize: 10, cellPadding: 3 },
            columnStyles: { 0: { fontStyle: 'bold', width: 60 } }
        });

        yPos = doc.lastAutoTable.finalY + 10;

        // --- Uploaded Documents Information ---
        const documents = [];
        const checkDoc = (url, name) => {
            if (url) {
                // Try to extract filename
                try {
                    const urlObj = new URL(url);
                    const pathParts = urlObj.pathname.split('/');
                    const fileName = pathParts[pathParts.length - 1];
                    documents.push([name, fileName, 'Uploaded']);
                } catch (e) {
                    documents.push([name, 'View Online', 'Uploaded']);
                }
            } else {
                documents.push([name, '-', 'Pending']);
            }
        };

        checkDoc(application.photo_url, 'Student Photo');
        checkDoc(application.signature_url, 'Signature');
        checkDoc(application.id_proof_url, 'ID Proof');
        checkDoc(application.marksheet_10th_url, '10th Marksheet');
        checkDoc(application.marksheet_12th_url, '12th Marksheet');
        checkDoc(application.marksheet_degree_url, 'Degree Marksheet');
        checkDoc(application.certificate_url, 'Completion Certificate');

        autoTable(doc, {
            startY: yPos,
            head: [['Document Name', 'File Name', 'Status']],
            body: documents,
            theme: 'grid',
            headStyles: { fillColor: primColor, textColor: 255, fontSize: 12 },
            styles: { fontSize: 10, cellPadding: 3 },
            columnStyles: { 0: { fontStyle: 'bold', width: 60 } }
        });

        // --- Declaration Section ---
        // CRITICAL FIX: specific yPos update after table
        yPos = doc.lastAutoTable.finalY + 20;

        const pageHeight = doc.internal.pageSize.height;

        // Ensure space for Declaration + Signature (approx 80 units)
        if (yPos + 80 > pageHeight - 20) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Declaration:', 15, yPos);
        yPos += 7;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(
            'I hereby declare that the information provided above is true and correct to the best of my knowledge and belief. I understand that my admission is liable to be cancelled if any information is found to be false or incorrect.',
            15,
            yPos,
            { maxWidth: pageWidth - 30 }
        );

        yPos += 25;

        // --- Signature Section ---
        let signatureBase64 = null;
        if (application.signature_url) {
            signatureBase64 = await fetchImage(application.signature_url);
        }

        // Add Signature at the bottom (ensure it fits)
        if (signatureBase64) {
            // Check remaining space
            const pageHeight = doc.internal.pageSize.height;
            if (yPos + 50 > pageHeight - 20) {
                doc.addPage();
                yPos = 20;
            } else {
                yPos += 20;
            }

            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text('Signature of Student:', 15, yPos);

            // Add signature image
            try {
                // Determine format from base64 header if possible, or let jsPDF decide
                doc.addImage(signatureBase64, 15, yPos + 5, 40, 20);
            } catch (e) {
                console.error("Error adding signature image", e);
                doc.text("(Signature Image Load Error)", 15, yPos + 15);
            }
        }

        // --- Footer ---
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
            doc.text('Admission System', 15, doc.internal.pageSize.height - 10);
        }

        // Save PDF
        const safeName = (application.student_name || 'Application').replace(/[^a-z0-9]/gi, '_');
        doc.save(`${safeName}_${application.application_id}.pdf`);
        return true;

    } catch (error) {
        console.error('PDF generation error:', error);
        alert('Failed to generate PDF. Error: ' + error.message);
        return false;
    }
};
