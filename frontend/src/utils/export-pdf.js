export async function exportElementAsPdf(element, filename, orientation, captureWidth, fitContent = false) {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf")
    ]);
    const previousWidth = element.style.width;
    const previousMaxWidth = element.style.maxWidth;
    element.classList.add("pdf-exporting");
    if (captureWidth) {
        element.style.width = `${captureWidth}px`;
        element.style.maxWidth = "none";
    }
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    try {
        const captureHeight = element.scrollHeight;
        const captureFullWidth = element.scrollWidth;
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff",
            width: captureFullWidth,
            height: captureHeight,
            windowWidth: captureFullWidth,
            windowHeight: captureHeight,
            scrollX: 0,
            scrollY: 0
        });
        const contentWidth = 410;
        const contentHeight = contentWidth * canvas.height / canvas.width;
        const contentMargin = 4;
        const pdf = new jsPDF({
            orientation,
            unit: "mm",
            format: fitContent
                ? [contentWidth + contentMargin * 2, contentHeight + contentMargin * 2]
                : "a4",
            compress: true
        });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = fitContent ? contentMargin : 5;
        const ratio = fitContent
            ? contentWidth / canvas.width
            : Math.min((pageWidth - margin * 2) / canvas.width, (pageHeight - margin * 2) / canvas.height);
        const imageWidth = canvas.width * ratio;
        const imageHeight = canvas.height * ratio;
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.96), "JPEG", fitContent ? margin : (pageWidth - imageWidth) / 2, fitContent ? margin : (pageHeight - imageHeight) / 2, imageWidth, imageHeight, undefined, "FAST");
        pdf.save(filename);
    }
    finally {
        element.classList.remove("pdf-exporting");
        element.style.width = previousWidth;
        element.style.maxWidth = previousMaxWidth;
    }
}
