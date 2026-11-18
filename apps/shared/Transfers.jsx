import React, { useState } from "react";
import { Download, Landmark, Upload } from "lucide-react";
import { dateInZone } from "./time.mjs";

export const mxn = (amount) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
    Number(amount),
  );

export function TransferOrder({ db, order, onUpdate }) {
  const [current, setCurrent] = useState(order);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { clabe, holder, concept } = current.transfer_details || {};
  const expired = new Date(current.reserved_until) <= new Date();
  async function upload(event) {
    event.preventDefault();
    const file = new FormData(event.currentTarget).get("receipt");
    if (!file?.size || file.size > 8 * 1024 * 1024) {
      setError("Selecciona un comprobante de hasta 8 MB.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const path = `${current.id}/${crypto.randomUUID()}`;
      const { error } = await db.storage
        .from("pari-receipts")
        .upload(path, file);
      if (error) throw error;
      const result = await db.rpc("pari_submit_receipt", {
        p_order_id: current.id,
        p_path: path,
      });
      if (result.error) throw result.error;
      setCurrent({ ...current, ...result.data });
      onUpdate?.(result.data);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="panel transfer-order">
      <Landmark size={26} />
      <h2>
        {current.status === "cancelled"
          ? "Apartado cancelado"
          : current.receipt_path
            ? "Comprobante en revisión"
            : expired
              ? "Apartado vencido"
              : "Tus boletos están apartados"}
      </h2>
      <p>
        {current.pari_events?.title} · {current.quantity} acceso(s) ·{" "}
        {mxn(current.total)} MXN
      </p>
      {current.status === "pending" &&
        (current.receipt_path ? (
          <p>
            El organizador revisará tu comprobante en un plazo de hasta 24
            horas. Tu QR aparecerá aquí cuando confirme el pago.
          </p>
        ) : (
          !expired && (
            <>
              <p>
                {current.is_demo
                  ? "Esta cuenta es de prueba. Puedes subir un comprobante de ejemplo para probar el flujo."
                  : "Transfiere el importe exacto y sube tu comprobante antes de que venza tu apartado."}
              </p>
              <dl>
                <dt>CLABE</dt>
                <dd>{clabe}</dd>
                <dt>Titular</dt>
                <dd>{holder}</dd>
                <dt>Concepto</dt>
                <dd>{concept}</dd>
                <dt>Vence</dt>
                <dd>{dateInZone(current.reserved_until)}</dd>
              </dl>
              <form onSubmit={upload}>
                <label className="field">
                  <span>Comprobante en JPG, PNG, WebP o PDF</span>
                  <input
                    type="file"
                    name="receipt"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    disabled={busy}
                    required
                  />
                </label>
                <button className="primary" disabled={busy}>
                  <Upload size={16} />
                  {busy ? "Subiendo…" : "Enviar comprobante"}
                </button>
              </form>
            </>
          )
        ))}
      {error && <p role="alert">{error}</p>}
    </article>
  );
}

export function TransferReview({ db, orders, refresh }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [download, setDownload] = useState(null);
  async function open(order) {
    setMessage("");
    const { data, error } = await db.storage
      .from("pari-receipts")
      .createSignedUrl(order.receipt_path, 60, { download: true });
    if (error) setMessage(error.message);
    else setDownload({ id: order.id, url: data.signedUrl });
  }
  async function review(id, approve) {
    setBusy(true);
    setMessage("");
    try {
      const { error } = await db.rpc("pari_review_transfer", {
        p_order_id: id,
        p_approve: approve,
      });
      if (error) throw error;
      setDownload(null);
      setMessage(
        approve
          ? "Pago aprobado. El boleto ya está disponible para el comprador."
          : "Comprobante rechazado. Se liberaron los accesos.",
      );
      refresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }
  const pending = orders.filter(
    (order) =>
      order.payment_method === "transfer" && order.status === "pending",
  );
  return (
    <section className="panel transfers-panel">
      <h2>Transferencias pendientes</h2>
      {message && <p role="status">{message}</p>}
      {!pending.length && (
        <p>No hay transferencias pendientes para esta selección.</p>
      )}
      {pending.map((order) => (
        <article key={order.id} className="transfer-review">
          <h3>
            {order.attendee_name} · {mxn(order.total)} MXN
          </h3>
          <p>
            Orden {order.id.slice(0, 8).toUpperCase()} · {order.quantity}{" "}
            acceso(s){order.is_demo && " · Prueba"}
          </p>
          {order.receipt_path ? (
            <>
              <p>
                Comprobante enviado el {dateInZone(order.receipt_submitted_at)}.
                Verifica el depósito en la cuenta antes de aprobar.
              </p>
              <div className="transfer-actions">
                <button className="secondary" onClick={() => open(order)}>
                  <Download size={16} /> Preparar descarga
                </button>
                {download?.id === order.id && (
                  <a className="secondary" href={download.url}>
                    Descargar comprobante
                  </a>
                )}
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => review(order.id, true)}
                >
                  Aprobar pago
                </button>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => review(order.id, false)}
                >
                  Rechazar
                </button>
              </div>
            </>
          ) : (
            <p>
              Esperando comprobante hasta {dateInZone(order.reserved_until)}.
            </p>
          )}
        </article>
      ))}
    </section>
  );
}
