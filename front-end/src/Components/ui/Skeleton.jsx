export default function Skeleton({ height = 18, width = '100%', radius = 8 }) {
  return <span className="d-block placeholder placeholder-glow rounded" style={{ height, width, borderRadius: radius }} />;
}
