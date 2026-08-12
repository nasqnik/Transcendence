type LegalBlock =
  | { type: 'p'; text: string }
  | { type: 'ul'; items: Array<{ label?: string; text: string }> }

export interface LegalSectionData {
  id: string
  heading: string
  blocks: LegalBlock[]
}

export function LegalSection({ section }: { section: LegalSectionData }) {
  return (
    <section aria-labelledby={section.id}>
      <h2 id={section.id} className="font-heading text-xl font-semibold text-gray-800 mb-2">
        {section.heading}
      </h2>
      {section.blocks.map((block, i) => {
        if (block.type === 'p') {
          return (
            <p key={i} className="font-body text-sm text-gray-700 leading-relaxed mt-2 first:mt-0">
              {block.text}
            </p>
          )
        }
        return (
          <ul
            key={i}
            className="font-body text-sm text-gray-700 leading-relaxed list-disc list-inside space-y-1 mt-2 first:mt-0"
          >
            {block.items.map((item, j) => (
              <li key={j}>
                {item.label && <strong>{item.label} </strong>}
                {item.text}
              </li>
            ))}
          </ul>
        )
      })}
    </section>
  )
}
