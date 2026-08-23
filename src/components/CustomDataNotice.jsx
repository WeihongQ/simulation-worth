export default function CustomDataNotice({ show }) {
  if (!show) return null;
  return (
    <p className="data-banner">
      Showing results from <strong>your</strong> uploaded data, not the
      Twin-2K-500 demo dataset. Switch back on the &ldquo;Try your
      data&rdquo; tab.
    </p>
  );
}
