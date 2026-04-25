export const useExportPdf = () => {
  const exportElementAsPdf = async (elementId, fileName) => {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
    const target = document.getElementById(elementId);

    if (!target) {
      throw new Error("Unable to find export section.");
    }

    const canvas = await html2canvas(target, { scale: 2, useCORS: true });
    const imageData = canvas.toDataURL("image/png");

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const availableWidth = pageWidth - margin * 2;
    const imageHeight = (canvas.height * availableWidth) / canvas.width;

    let currentY = margin;
    let remainingHeight = imageHeight;

    pdf.addImage(imageData, "PNG", margin, currentY, availableWidth, imageHeight);
    remainingHeight -= pageHeight - margin * 2;

    while (remainingHeight > 0) {
      pdf.addPage();
      currentY = margin - (imageHeight - remainingHeight);
      pdf.addImage(imageData, "PNG", margin, currentY, availableWidth, imageHeight);
      remainingHeight -= pageHeight - margin * 2;
    }

    pdf.save(fileName);
  };

  return { exportElementAsPdf };
};
