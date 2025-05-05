const { jsPDF } = window.jspdf;

let labelData = [];

// Validate form inputs
function validateInputs() {
    const projectName = document.getElementById('project_name').value.trim();
    const projectLocation = document.getElementById('project_location').value.trim();
    const projectDate = document.getElementById('project_date').value.trim();

    if (!projectName || !projectLocation || !projectDate) {
        alert("Please fill out all fields before proceeding.");
        return false;
    }
    return true;
}

// Handle file submission
window.handleFileSubmit = function () {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const data = e.target.result;
            const extension = file.name.split('.').pop().toLowerCase();

            if (extension === 'csv') {
                parseCSV(data);
            } else if (extension === 'xlsx' || extension === 'xls') {
                parseXLSX(data);
            } else {
                alert('Invalid file format. Please upload a CSV or XLSX file.');
            }
        };
        reader.readAsText(file);
    }
};

// Parse CSV data
function parseCSV(data) {
    const rows = data.split('\n').filter(row => row.trim()); // Ignore empty lines
    const headers = rows[0].split(',').map(header => header.trim());

    const channelIndex = headers.indexOf('CHANNEL');
    const fixtureNumberIndex = headers.indexOf('FIXTURE_NUMBER');    
    const addressIndex = headers.indexOf('ADDRESS');
    const LabelIndex = headers.indexOf('LABEL');
    const modeIndex = headers.indexOf('MODE');

    // Check if all required headers exist
    if ((channelIndex === -1 && fixtureNumberIndex === -1) || addressIndex === -1 || LabelIndex === -1 || modeIndex === -1) {
        alert('Invalid CSV format. Ensure the file contains headers: CHANNEL or FIXTURE_NUMBER, ADDRESS, Label, MODE.');
        return;
    }
    

    // Map rows to objects, skipping invalid rows
    labelData = rows.slice(1).map(row => {
        const cols = row.split(',').map(col => col.trim());

        return {
            channel: cols[channelIndex] || cols[fixtureNumberIndex] || 'No Data',
            address: cols[addressIndex] || 'No Data',
            Label: cols[LabelIndex] || 'No Data',
            mode: cols[modeIndex] || 'No Data',
        };
    }).filter(label => label.channel !== 'No Data'); // Optional: Exclude rows without channel data

    if (labelData.length === 0) {
        alert('No valid data found in the CSV file.');
        return;
    }

    document.querySelector('.generate-pdf-btn').style.display = 'inline-block';
    document.querySelector('.preview-btn').style.display = 'inline-block';
}


// Parse XLSX data
function parseXLSX(data) {
    const wb = XLSX.read(data, { type: 'binary' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

    const headers = rows[0];
    const channelIndex = headers.indexOf('CHANNEL');
    const fixtureNumberIndex = headers.indexOf('FIXTURE_NUMBER');    
    const addressIndex = headers.indexOf('ADDRESS');
    const LabelIndex = headers.indexOf('LABEL');
    const modeIndex = headers.indexOf('MODE');

    labelData = rows.slice(1).map(row => {
        return {
            channel: row[channelIndex]?.trim() || row[fixtureNumberIndex]?.trim() || 'No Data',
            address: row[addressIndex]?.trim() || '',
            Label: row[LabelIndex]?.trim() || '',
            mode: row[modeIndex]?.trim() || ''
        };
    });

    document.querySelector('.generate-pdf-btn').style.display = 'inline-block';
    document.querySelector('.preview-btn').style.display = 'inline-block';
}

// Generate PDF
function createPDF() {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const labelWidth = (pageWidth - 30) / 2;
    const labelHeight = 42.53;
    const margin = 10;
    const verticalSpacing = 5;
    const labelsPerRow = 2;
    const labelsPerColumn = Math.floor((pageHeight - margin * 2 - 20) / (labelHeight + verticalSpacing));
    const labelsPerPage = labelsPerRow * labelsPerColumn;

    let currentX = margin;
    let currentY = margin + 15;
    let labelCount = 0;

    const projectName = document.getElementById('project_name').value.trim();
    const projectLocation = document.getElementById('project_location').value.trim();
    const projectDate = document.getElementById('project_date').value.trim();

    const headerText = `Project: ${projectName}, Location: ${projectLocation}, Date: ${projectDate}`;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(12);

    labelData.forEach((label, index) => {
        if (labelCount >= labelsPerPage) {
            doc.addPage();
            currentX = margin;
            currentY = margin + 15;
            labelCount = 0;
            doc.text(headerText, margin, margin + 5);
        }

        if (index === 0) {
            doc.text(headerText, margin, margin + 5);
        }

        // Draw Rounded Label Border with Increased Thickness
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.8); // Increased border width
        doc.roundedRect(currentX, currentY, labelWidth, labelHeight, 5, 5);

        // CHANNEL Value (Largest, Bold, Centered)
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(75); // Adjusted size for larger font
        doc.text(label.channel || 'No Data', currentX + labelWidth / 2, currentY + labelHeight / 2 - 0, {
            align: 'center',
        });

        // ADDRESS Value (Right Bottom with Green Background)
        const addressHeader = 'DMX Address:';
        const addressValue = label.address || 'No Data';
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(10);

        const addressHeaderWidth = doc.getTextWidth(addressHeader);
        const addressValueWidth = doc.getTextWidth(addressValue);

        const addressX = currentX + labelWidth - Math.max(addressHeaderWidth, addressValueWidth) - 10;
        const addressYHeader = currentY + labelHeight - 12; // Moved closer to the bottom
        const addressYValue = currentY + labelHeight - 5;

        // Dark Green Background for Address
        doc.setFillColor(0, 128, 0); // Dark Green
        doc.roundedRect(
            addressX - 2,
            addressYHeader - 5,
            Math.max(addressHeaderWidth, addressValueWidth) + 4,
            14,
            2,
            2,
            'F'
        );

        // Address Text
        doc.setTextColor(255, 255, 255);
        doc.text(addressHeader, addressX, addressYHeader);
        doc.text(addressValue, addressX, addressYValue);

        // MODE and FIXTURE_TYPE (Left Bottom, Stacked)
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.text(`Mode: ${label.mode || 'No Data'}`, currentX + 5, currentY + labelHeight - 12);
        doc.text(`Fixture: ${label.Label || 'No Data'}`, currentX + 5, currentY + labelHeight - 6);

        // Update label position
        labelCount++;
        if (labelCount % labelsPerRow === 0) {
            currentX = margin;
            currentY += labelHeight + verticalSpacing;
        } else {
            currentX += labelWidth + 10;
        }
    });

    return doc;
}

// Save and Preview
window.generatePDF = function () {
    const doc = createPDF();
    
    const projectName = document.getElementById('project_name').value.trim();
    const projectDate = document.getElementById('project_date').value.trim();
    
    // Convert project date to "dd mmm yyyy" format
    const dateObj = new Date(projectDate);
    const formattedDate = dateObj.getDate().toString().padStart(2, '0') + ' ' +
                          dateObj.toLocaleString('en-US', { month: 'short' }) + ' ' +
                          dateObj.getFullYear();

    const fileName = (projectName + '_' + formattedDate).trim() + '.pdf' || 'labels.pdf';

    doc.save(fileName);
};

window.previewLabels = function () {
    const doc = createPDF();
    const pdfDataUri = doc.output('datauristring');
    localStorage.setItem('pdf_preview', pdfDataUri);
    window.location.href = 'preview.html';
};

if (window.location.pathname.includes('preview.html')) {
    const pdfData = localStorage.getItem('pdf_preview');
    if (pdfData) {
        const pdfContainer = document.getElementById('pdf-container');
        const pdfDataArrayBuffer = atob(pdfData.split(',')[1]);

        const loadingTask = pdfjsLib.getDocument({ data: pdfDataArrayBuffer });
        loadingTask.promise.then(pdf => {
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                pdf.getPage(pageNum).then(page => {
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    const viewport = page.getViewport({ scale: 1.5 });

                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    pdfContainer.appendChild(canvas);

                    page.render({ canvasContext: context, viewport: viewport });
                });
            }
        });
    } else {
        document.body.innerHTML = '<h2>No preview available. Please generate labels first.</h2>';
    }
}
