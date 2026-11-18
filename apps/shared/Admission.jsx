import React, { useEffect, useRef, useState } from "react";
import { Camera, Download, MapPin, Ticket } from "lucide-react";
import { dateInZone } from "./time.mjs";

export function TicketReceipt({ order }) {
  const [qr, setQr] = useState("");
  const [failed, setFailed] = useState(false);
  const event = order.pari_events || {};
  const active =
    order.status === "paid" && !order.checked_in_at && !!order.qr_token;
  const group = order.quantity > 1;
  const folio = order.id.slice(0, 8).toUpperCase();
  const when =
    event.starts_at &&
    dateInZone(event.starts_at, event.time_zone || undefined);
  useEffect(() => {
    let current = true;
    setQr("");
    setFailed(false);
    if (active)
      import("qrcode")
        .then(({ default: QRCode }) =>
          QRCode.toDataURL(order.qr_token, {
            width: 512,
            margin: 4,
            errorCorrectionLevel: "M",
          }),
        )
        .then((url) => {
          if (current) setQr(url);
        })
        .catch(() => {
          if (current) setFailed(true);
        });
    return () => {
      current = false;
    };
  }, [active, order.qr_token]);
  return (
    <article className="admission-pass">
      <header>
        <Ticket size={22} />
        <strong>ticket pari</strong>
        <span>{order.is_demo ? "PASE DE PRUEBA" : "PASE DIGITAL"}</span>
      </header>
      <div className="pass-event">
        <small>{event.category || "Acceso general"}</small>
        <h3>{event.title || "Evento"}</h3>
        {when && <p>{when}</p>}
        {event.venue_name && (
          <p>
            <MapPin size={14} />
            {[event.venue_name, event.city].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
      <div className="pass-details">
        <div>
          <small>Titular</small>
          <b>{order.attendee_name || "Titular de la cuenta"}</b>
        </div>
        <div>
          <small>Accesos</small>
          <b>{order.quantity} · General</b>
        </div>
        <div>
          <small>Total de la orden</small>
          <b>
            {Number(order.total).toLocaleString("es-MX", {
              style: "currency",
              currency: "MXN",
            })}{" "}
            MXN
          </b>
        </div>
        <div>
          <small>Folio</small>
          <b>{folio}</b>
        </div>
      </div>
      <div className="pass-stub">
        <strong>
          {active
            ? "Tu QR de entrada"
            : order.checked_in_at
              ? "Ingreso registrado"
              : "Acceso no disponible"}
        </strong>
        {active && (
          <>
            <p>
              {group
                ? `Este QR admite a ${order.quantity} personas en un solo ingreso. Entren juntos.`
                : "Muestra este QR al llegar al evento."}
            </p>
            {qr && (
              <img
                width="208"
                height="208"
                src={qr}
                alt="Código QR de acceso al evento"
              />
            )}
            {failed && (
              <p role="alert">
                Usa el código de acceso manual que aparece abajo.
              </p>
            )}
            {qr && (
              <a
                className="secondary"
                href={qr}
                download={`Ticket-Pari-${folio}-QR.png`}
              >
                <Download size={16} /> Guardar QR
              </a>
            )}
            <details>
              <summary>Ver código de acceso manual</summary>
              <code>{order.qr_token}</code>
            </details>
          </>
        )}
      </div>
    </article>
  );
}

export function DoorScanner({ onRead }) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const video = useRef(null);
  useEffect(() => {
    if (!running) return;
    let cancelled = false,
      scanner,
      accepted = false;
    async function start() {
      try {
        const { default: Scanner } = await import("qr-scanner");
        if (cancelled) return;
        scanner = new Scanner(
          video.current,
          ({ data }) => {
            if (cancelled || accepted) return;
            if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(data)) {
              setError("Este QR no corresponde a un boleto de Ticket Pari.");
              return;
            }
            accepted = true;
            onRead(data.toLowerCase());
            setError("");
            setRunning(false);
          },
          {
            preferredCamera: "environment",
            returnDetailedScanResult: true,
            maxScansPerSecond: 6,
          },
        );
        await scanner.start();
      } catch {
        if (!cancelled) {
          setError(
            "Revisa el permiso de cámara o introduce el código del boleto.",
          );
          setRunning(false);
        }
      }
    }
    start();
    return () => {
      cancelled = true;
      scanner?.destroy();
    };
  }, [running, onRead]);
  return (
    <div className="door-scanner">
      {running && (
        <video
          ref={video}
          muted
          playsInline
          aria-label="Cámara del lector QR"
        />
      )}
      <button
        type="button"
        className="secondary"
        onClick={() => {
          setError("");
          setRunning((v) => !v);
        }}
      >
        <Camera size={17} />
        {running ? "Cerrar cámara" : "Escanear QR con cámara"}
      </button>
      {error && <p role="status">{error}</p>}
    </div>
  );
}
