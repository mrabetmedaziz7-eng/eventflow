export default function Loading() {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center min-vh-50 py-5">
      <div className="spinner-border text-primary" role="status" style={{ width: "3rem", height: "3rem" }}>
        <span className="visually-hidden">Loading...</span>
      </div>
      <p className="mt-3 text-secondary">Chargement...</p>
    </div>
  );
}

