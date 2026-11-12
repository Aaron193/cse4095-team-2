interface PlaceholderProps {
  title: string;
  /** The task that replaces this placeholder, for example "P1-D3". */
  task: string;
  children?: React.ReactNode;
}

/** A stand-in screen: a heading and a note saying which task builds the real one. */
export function Placeholder({ title, task, children }: PlaceholderProps) {
  return (
    <section className="placeholder">
      <h1>{title}</h1>
      <p className="placeholder__note">Placeholder. Built in task {task}.</p>
      {children}
    </section>
  );
}
