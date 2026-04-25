export const copyText = async (text) => {
  const content = String(text ?? "");
  if (!content.trim()) {
    throw new Error("Nothing to copy.");
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(content);
    return;
  }

  const helperInput = document.createElement("textarea");
  helperInput.value = content;
  helperInput.setAttribute("readonly", "");
  helperInput.style.position = "fixed";
  helperInput.style.opacity = "0";
  document.body.appendChild(helperInput);
  helperInput.select();
  document.execCommand("copy");
  document.body.removeChild(helperInput);
};
