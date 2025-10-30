interface ErrorMessageProps {
  error: string;
}

function ErrorMessage({ error }: ErrorMessageProps) {
  return (
    <div
      style={{
        padding: '15px',
        background: '#ffebee',
        borderRadius: '4px',
        marginTop: '20px',
        color: '#c62828',
      }}
    >
      <strong>Error:</strong> {error}
    </div>
  );
}

export default ErrorMessage;
