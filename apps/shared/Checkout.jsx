import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Ticket,
  CalendarDays,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  CreditCard,
  LockKeyhole,
  UserRound,
} from "lucide-react";
import { dateInZone } from "./time.mjs";
const money = (n) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(Number(n || 0));
export default function Checkout({
  event,
  initialQuantity = 1,
  session,
  profile,
  db,
  onBack,
  onSuccess,
  renderAuth,
}) {
  const [step, setStep] = useState(1),
    [quantity, setQuantity] = useState(initialQuantity),
    [attendee, setAttendee] = useState({
      name: profile?.full_name || "",
      email: session?.user?.email || "",
      phone: profile?.phone || "",
    }),
    [method, setMethod] = useState("card"),
    [card, setCard] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const heading = useRef(null),
    submitting = useRef(false);
  useEffect(() => {
    setAttendee((a) => ({
      ...a,
      name: a.name || profile?.full_name || "",
      email: a.email || session?.user?.email || "",
      phone: a.phone || profile?.phone || "",
    }));
  }, [session?.user?.id, profile?.id]);
  useEffect(() => {
    window.scrollTo(0, 0);
    heading.current?.focus({ preventScroll: true });
  }, [step]);
  useEffect(() => {
    if (!session && step === 3) {
      setStep(2);
      setCard("");
    }
  }, [session, step]);
  const total = Number(event.ticket_price) * quantity,
    limit = Math.min(10, event.ticket_inventory ?? 10),
    soldOut = limit < 1;
  function next(ev) {
    ev.preventDefault();
    setError("");
    if (step === 2) {
      if (attendee.name.trim().length < 2) {
        setError("Escribe el nombre completo del asistente.");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attendee.email.trim())) {
        setError("Escribe un correo válido.");
        return;
      }
      if (
        attendee.phone.trim() &&
        !/^[+0-9() .-]{7,30}$/.test(attendee.phone.trim())
      ) {
        setError("Escribe un celular válido o deja el campo vacío.");
        return;
      }
    }
    setStep((s) => s + 1);
  }
  function edit(s) {
    if (busy) return;
    setError("");
    setStep(s);
  }
  function quantityChange(n) {
    setQuantity(n);
    setRequestId(crypto.randomUUID());
    setError("");
  }
  async function pay(ev) {
    ev.preventDefault();
    if (submitting.current || !session) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const request = {
        p_event_id: event.id,
        p_quantity: quantity,
        p_request_id: requestId,
      };
      const { data, error } =
        method === "transfer"
          ? await db.rpc("pari_reserve_transfer", {
              ...request,
              p_name: attendee.name.trim(),
              p_email: attendee.email.trim(),
              p_phone: attendee.phone.trim(),
            })
          : await db.rpc("pari_checkout_demo", {
              ...request,
              p_card: card.replace(/\s/g, ""),
              p_attendee_name: attendee.name.trim(),
              p_attendee_email: attendee.email.trim(),
              p_attendee_phone: attendee.phone.trim(),
            });
      if (error) throw error;
      setCard("");
      onSuccess(data);
    } catch (e) {
      setError(e.message);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="checkout-page">
      <button
        className="back-button"
        disabled={busy}
        onClick={step > 1 ? () => edit(step - 1) : () => onBack(quantity)}
      >
        <ArrowLeft size={17} />
        {step > 1 ? "Paso anterior" : "Volver al evento"}
      </button>
      <div className="checkout-heading">
        <span className="eyebrow">UN PASO MÁS CERCA DE TU PRÓXIMO PLAN</span>
        <h1 ref={heading} tabIndex={-1}>
          {
            [
              "Elige tus boletos.",
              "Personaliza tu entrada.",
              "Revisa y confirma.",
            ][step - 1]
          }
        </h1>
        <p>
          {event.title} · {event.city}
        </p>
      </div>
      <ol className="checkout-steps" aria-label="Progreso de compra">
        {["Boletos", "Tus datos", "Pago"].map((label, i) => (
          <li
            key={label}
            className={
              step === i + 1 ? "current" : step > i + 1 ? "complete" : ""
            }
            aria-current={step === i + 1 ? "step" : undefined}
          >
            <span>{step > i + 1 ? <Check size={16} /> : i + 1}</span>
            <b>{label}</b>
          </li>
        ))}
      </ol>
      <div className="checkout-grid">
        <div className="checkout-main">
          {step === 1 && (
            <form className="checkout-step-panel" onSubmit={next}>
              <div className="step-title">
                <Ticket />
                <div>
                  <span>PASO 01</span>
                  <h2>¿Cuántos van al plan?</h2>
                </div>
              </div>
              <div className="ticket-option">
                <div>
                  <span className="badge">ACCESO GENERAL</span>
                  <h3>Entrada general</h3>
                  <p>Acceso al evento para una persona.</p>
                  <strong>
                    {money(event.ticket_price)} <small>MXN</small>
                  </strong>
                </div>
                <div className="ticket-counter">
                  <button
                    type="button"
                    aria-label="Quitar boleto"
                    disabled={quantity <= 1}
                    onClick={() => quantityChange(quantity - 1)}
                  >
                    <Minus size={18} />
                  </button>
                  <output aria-label="Cantidad de boletos" aria-live="polite">
                    {quantity}
                  </output>
                  <button
                    type="button"
                    aria-label="Agregar boleto"
                    disabled={quantity >= limit}
                    onClick={() => quantityChange(quantity + 1)}
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
              <div className="purchase-benefits">
                <span>
                  <Ticket size={17} />
                  QR disponible al confirmar
                </span>
                <span>
                  <ShieldCheck size={17} />
                  Sin cargos adicionales
                </span>
              </div>
              <p className="muted">
                {soldOut
                  ? "Este evento está agotado."
                  : event.ticket_inventory === null
                    ? "Máximo 10 boletos por compra."
                    : `${event.ticket_inventory} boletos disponibles · máximo 10 por compra.`}
              </p>
              <button className="primary checkout-continue" disabled={soldOut}>
                Continuar con mis datos
                <ArrowRight size={18} />
              </button>
            </form>
          )}
          {step === 2 &&
            (!session ? (
              <div className="checkout-step-panel checkout-auth">
                <div className="step-title">
                  <UserRound />
                  <div>
                    <span>PASO 02</span>
                    <h2>Guarda tus boletos en tu cuenta.</h2>
                  </div>
                </div>
                <p className="muted">
                  Inicia sesión o regístrate para continuar. Conservaremos tu
                  selección.
                </p>
                {renderAuth()}
              </div>
            ) : (
              <form className="checkout-step-panel" onSubmit={next}>
                <div className="step-title">
                  <UserRound />
                  <div>
                    <span>PASO 02</span>
                    <h2>¿A nombre de quién?</h2>
                  </div>
                </div>
                <p className="muted">
                  Estos datos quedarán asociados a tus boletos. Podrás
                  consultarlos en tu cuenta; el organizador podrá usarlos para
                  identificar tu acceso.
                </p>
                <label className="field">
                  <span>Nombre completo del asistente</span>
                  <input
                    name="attendee_name"
                    autoComplete="name"
                    value={attendee.name}
                    onChange={(e) =>
                      setAttendee((a) => ({ ...a, name: e.target.value }))
                    }
                    minLength={2}
                    maxLength={150}
                    required
                  />
                </label>
                <label className="field">
                  <span>Correo del asistente</span>
                  <input
                    name="attendee_email"
                    type="email"
                    autoComplete="email"
                    value={attendee.email}
                    onChange={(e) =>
                      setAttendee((a) => ({ ...a, email: e.target.value }))
                    }
                    maxLength={254}
                    required
                  />
                </label>
                <label className="field">
                  <span>Celular (opcional)</span>
                  <input
                    name="attendee_phone"
                    type="tel"
                    autoComplete="tel"
                    value={attendee.phone}
                    onChange={(e) =>
                      setAttendee((a) => ({ ...a, phone: e.target.value }))
                    }
                    maxLength={30}
                  />
                </label>
                {error && (
                  <div className="notice" role="alert">
                    {error}
                  </div>
                )}
                <div className="delivery-note">
                  <Ticket size={20} />
                  <p>
                    <b>Tu entrada siempre a la mano.</b>
                    <span>
                      Tu QR quedará en Mis boletos. También podrás guardarlo en
                      tu celular.
                    </span>
                  </p>
                </div>
                <button className="primary checkout-continue">
                  Continuar al pago
                  <ArrowRight size={18} />
                </button>
              </form>
            ))}
          {step === 3 && (
            <form className="checkout-step-panel" onSubmit={pay}>
              <div className="step-title">
                <CreditCard />
                <div>
                  <span>PASO 03</span>
                  <h2>Confirma tu próximo plan.</h2>
                </div>
              </div>
              <div className="attendee-review">
                <div>
                  <span>ASISTENTE</span>
                  <b>{attendee.name}</b>
                  <small>{attendee.email}</small>
                  {attendee.phone && <small>{attendee.phone}</small>}
                </div>
                <button
                  className="text-button"
                  type="button"
                  disabled={busy}
                  onClick={() => edit(2)}
                >
                  Editar
                </button>
              </div>
              <label className="field">
                <span>Método de pago</span>
                <select
                  value={method}
                  disabled={busy}
                  onChange={(e) => {
                    setMethod(e.target.value);
                    setRequestId(crypto.randomUUID());
                    setError("");
                  }}
                >
                  <option value="card">Tarjeta de prueba</option>
                  <option value="transfer">Transferencia bancaria</option>
                </select>
              </label>
              {method === "transfer" ? (
                <div className="demo-note">
                  <b>Aparta y paga por transferencia</b>
                  <span>
                    Después de confirmar verás la cuenta y podrás subir el
                    comprobante. El QR se habilita cuando el organizador apruebe
                    el pago.
                  </span>
                </div>
              ) : (
                <>
                  <div className="payment-method">
                    <span>
                      <CreditCard size={20} />
                      <b>Tarjeta</b>
                    </span>
                    <span className="badge">SIMULACIÓN</span>
                  </div>
                  <div className="demo-note">
                    <b>Estás probando Ticket Pari</b>
                    <span>
                      No se realizará ningún cobro. Usa 1234 1234 1234 1234; no
                      introduzcas una tarjeta real.
                    </span>
                  </div>
                  <label className="field">
                    <span>Número de tarjeta de prueba</span>
                    <input
                      aria-label="Número de tarjeta de prueba"
                      inputMode="numeric"
                      autoComplete="off"
                      value={card}
                      onChange={(e) =>
                        setCard(
                          e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 16)
                            .replace(/(.{4})/g, "$1 ")
                            .trim(),
                        )
                      }
                      placeholder="1234 1234 1234 1234"
                      pattern="1234 1234 1234 1234"
                      title="Usa la tarjeta de prueba 1234 1234 1234 1234"
                      maxLength={19}
                      disabled={busy}
                      required
                    />
                  </label>
                </>
              )}
              {error && (
                <div className="notice" role="alert">
                  {error}
                </div>
              )}
              <div className="pay-total">
                <span>Total a confirmar</span>
                <b>{money(total)} MXN</b>
              </div>
              <button
                className="primary checkout-continue"
                disabled={busy || !session}
              >
                {busy
                  ? "Registrando tu orden…"
                  : method === "transfer"
                    ? "Confirmar y apartar boletos"
                    : `Confirmar compra · ${money(total)}`}
                <LockKeyhole size={17} />
              </button>
              <p className="secure-note">
                {method === "card"
                  ? "Compra simulada · sin cargos reales"
                  : "Validación manual del comprobante"}
              </p>
            </form>
          )}
        </div>
        <aside className="order-summary">
          <span className="eyebrow">TU PRÓXIMO PLAN</span>
          <img src={event.image_url} alt="" />
          <div className="summary-event">
            <span className="badge">{event.category || "Evento"}</span>
            <h2>{event.title}</h2>
            <p>
              <CalendarDays size={15} />
              {dateInZone(event.starts_at, event.time_zone)}
            </p>
            <p>
              <MapPin size={15} />
              {event.venue_name} · {event.city}
            </p>
          </div>
          <div className="summary-breakdown">
            <div>
              <span>Acceso general × {quantity}</span>
              <b>{money(total)}</b>
            </div>
            <div>
              <span>Cargos de servicio</span>
              <b>{money(0)}</b>
            </div>
            <div className="summary-total">
              <span>Total</span>
              <b>
                {money(total)}
                <small> MXN</small>
              </b>
            </div>
          </div>
          {quantity > 1 && (
            <p className="group-entry">
              <Ticket size={17} /> Un solo QR para {quantity} personas. El grupo
              entra junto.
            </p>
          )}
          <p className="summary-footnote">
            Tu compra se confirma al completar el pago. La disponibilidad se
            valida en ese momento.
          </p>
          {step > 1 && (
            <button
              className="text-button"
              disabled={busy}
              onClick={() => edit(1)}
            >
              Editar boletos
            </button>
          )}
        </aside>
      </div>
    </section>
  );
}
