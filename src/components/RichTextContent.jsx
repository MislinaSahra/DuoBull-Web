export default function RichTextContent({ content = "" }) {
  return <div className="rich-content">{String(content).split("\n").map((line, index) => {
    if (line.startsWith("## ")) return <h2 key={index}>{inline(line.slice(3))}</h2>;
    if (line.startsWith("> ")) return <blockquote key={index}>{inline(line.slice(2))}</blockquote>;
    if (line.startsWith("- ")) return <p key={index} className="rich-content__list">{inline(line.slice(2))}</p>;
    return line ? <p key={index}>{inline(line)}</p> : <br key={index} />;
  })}</div>;
}

function inline(text) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={index}>{part.slice(1, -1)}</em>;
    return part;
  });
}
