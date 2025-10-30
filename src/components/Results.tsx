interface ResultsData {
  totalFrames: number;
  processingTime: string;
  totalSizeKB: number;
  avgSizePerFrame: number;
}

interface ResultsProps {
  results: ResultsData;
}

function Results({ results }: ResultsProps) {
  return (
    <div
      style={{
        padding: '15px',
        borderRadius: '4px',
        marginTop: '20px',
      }}>
      <h3 style={{ marginTop: 0 }}>✓ Extraction Complete!</h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0' }}>
        <li>
          <strong>Processing time:</strong> {results.processingTime}s
        </li>
        <li>
          <strong>Total frame size:</strong> {results.totalSizeKB.toFixed(2)} KB (
          {(results.totalSizeKB / 1024).toFixed(2)} MB)
        </li>
      </ul>
    </div>
  );
}

export default Results;
