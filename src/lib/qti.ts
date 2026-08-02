import JSZip from "jszip";
import type { Quiz } from "./types";

const esc = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[char]!));

export async function buildCanvasQti(quiz: Quiz): Promise<Blob> {
  const items = quiz.questions.map((question, index) => {
    const id = `q${index + 1}`;
    const essay = question.type === "essay";
    const textEntry = essay || question.type === "short_answer" || question.type === "fill_blank";
    const response = textEntry
      ? `<response_str ident="response1" rcardinality="Single"><render_fib fibtype="String"/></response_str>`
      : `<response_lid ident="response1" rcardinality="${question.type === "multiple_choice" ? "Multiple" : "Single"}"><render_choice>${question.answers.map((answer, answerIndex) => `<response_label ident="a${answerIndex}"><material><mattext texttype="text/html">${esc(answer.text)}</mattext></material></response_label>`).join("")}</render_choice></response_lid>`;
    const correct = essay ? "" : question.answers.map((answer, answerIndex) => answer.correct ? `<varequal respident="response1">a${answerIndex}</varequal>` : "").join("");
    return `<item ident="${id}" title="Câu ${index + 1}"><itemmetadata><qtimetadata><qtimetadatafield><fieldlabel>points_possible</fieldlabel><fieldentry>${question.points}</fieldentry></qtimetadatafield></qtimetadata></itemmetadata><presentation><material><mattext texttype="text/html">${esc(question.text)}</mattext></material>${response}</presentation>${essay ? "" : `<resprocessing><outcomes><decvar maxvalue="${question.points}" minvalue="0" varname="SCORE" vartype="Decimal"/></outcomes><respcondition continue="No"><conditionvar>${correct}</conditionvar><setvar action="Set" varname="SCORE">${question.points}</setvar></respcondition></resprocessing>`}</item>`;
  }).join("");
  const assessment = `<?xml version="1.0" encoding="UTF-8"?><questestinterop><assessment ident="assessment1" title="${esc(quiz.title)}"><section ident="root_section">${items}</section></assessment></questestinterop>`;
  const manifest = `<?xml version="1.0" encoding="UTF-8"?><manifest identifier="uda_quiz" xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"><resources><resource identifier="assessment1" type="imsqti_xmlv1p2" href="assessment_qti.xml"><file href="assessment_qti.xml"/></resource></resources></manifest>`;
  const zip = new JSZip();
  zip.file("imsmanifest.xml", manifest);
  zip.file("assessment_qti.xml", assessment);
  return zip.generateAsync({ type: "blob", mimeType: "application/zip" });
}

export async function downloadCanvasQti(quiz: Quiz) {
  const blob = await buildCanvasQti(quiz);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${quiz.title.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "bo-de"}-canvas-qti.zip`;
  anchor.click();
  URL.revokeObjectURL(url);
}
