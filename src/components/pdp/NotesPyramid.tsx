interface NotesPyramidProps {
  topNotes?: string[]
  heartNotes?: string[]
  baseNotes?: string[]
}

function NotePill({ note }: { note: string }) {
  return (
    <span className="inline-flex items-center border border-stone/30 px-3 py-1 text-small text-stone">
      {note}
    </span>
  )
}

function NoteGroup({
  label,
  sublabel,
  notes,
}: {
  label: string
  sublabel: string
  notes: string[]
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-3">
        <p className="text-label uppercase tracking-[0.1em] text-accent w-14 shrink-0">
          {label}
        </p>
        <p className="text-small text-stone">{sublabel}</p>
      </div>
      <div className="flex flex-wrap gap-2 pl-[68px]">
        {notes.length > 0 ? (
          notes.map((note) => <NotePill key={note} note={note} />)
        ) : (
          <span className="text-small text-stone/50 italic">Not yet specified</span>
        )}
      </div>
    </div>
  )
}

export default function NotesPyramid({
  topNotes = [],
  heartNotes = [],
  baseNotes = [],
}: NotesPyramidProps) {
  if (topNotes.length === 0 && heartNotes.length === 0 && baseNotes.length === 0) return null

  return (
    <div>
      <p className="text-label uppercase tracking-[0.1em] text-bone mb-5">
        Fragrance Notes
      </p>
      <div className="flex flex-col gap-5">
        <NoteGroup label="Top" sublabel="First impression" notes={topNotes} />
        <div className="border-t border-stone/20" />
        <NoteGroup label="Heart" sublabel="The character" notes={heartNotes} />
        <div className="border-t border-stone/20" />
        <NoteGroup label="Base" sublabel="The lasting impression" notes={baseNotes} />
      </div>
    </div>
  )
}
