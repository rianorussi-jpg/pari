import React, { useEffect, useState } from "react";
import {
  Ticket,
  Search,
  MapPin,
  ArrowUpRight,
  ArrowLeft,
  Plus,
  Minus,
  CalendarDays,
  UserRound,
  BadgeCheck,
  LogOut,
  LayoutDashboard,
  ScanLine,
  Check,
  SlidersHorizontal,
  Music2,
  Mic2,
  PartyPopper,
  Sparkles,
  ImagePlus,
  X,
  ChevronRight,
  Download,
  Heart,
} from "lucide-react";
import "./ticket.css";
import Checkout from "./Checkout.jsx";
import { loadOwnProfile } from "./profile.mjs";
import { useSavedEvents, canOrganize } from "./saved.mjs";
import {
  zones,
  dateInZone as date,
  localInZone,
  utcFromLocal,
} from "./time.mjs";
const money = (n) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(Number(n || 0));
const cats = [
  ["Todos", Sparkles],
  ["Música", Music2],
  ["Fiestas", PartyPopper],
  ["Stand up", Mic2],
  ["Festivales", Ticket],
  ["Cultura", CalendarDays],
  ["Otros", Plus],
];
const img =
  "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1400&q=85";
export default function TicketApp({ db, mode = "client" }) {
  const [session, setSession] = useState(null),
    [ready, setReady] = useState(false),
    [storedProfile, setProfile] = useState(null),
    [profileUserId, setProfileUserId] = useState(null),
    [profileError, setProfileError] = useState(""),
    [view, setView] = useState(mode === "client" ? "discover" : "manage"),
    [selected, setSelected] = useState(null),
    [events, setEvents] = useState([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [refresh, setRefresh] = useState(0);
  const profile =
    storedProfile?.id === session?.user?.id ? storedProfile : null;
  const profileLoading = Boolean(session && profileUserId !== session.user.id);
  const [saved, toggleSaved] = useSavedEvents(session?.user?.id);
  const organizerAllowed = canOrganize(profile);
  const openEvent = (event) => {
    setSelected(event);
    window.scrollTo(0, 0);
  };
  const reload = () => setRefresh((x) => x + 1);
  useEffect(() => {
    if (!db) {
      setReady(true);
      return;
    }
    db.auth.getSession().then(({ data, error }) => {
      if (error) setError(error.message);
      setSession(data.session);
      setReady(true);
    });
    const {
      data: { subscription },
    } = db.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, [db]);
  useEffect(() => {
    if (!session) {
      setProfile(null);
      setProfileUserId(null);
      setProfileError("");
      return;
    }
    let active = true;
    const userId = session.user.id;
    setProfileError("");
    loadOwnProfile(db, userId)
      .then((data) => {
        if (active) setProfile(data);
      })
      .catch(() => {
        if (active) {
          setProfile(null);
          setProfileError(
            "No pudimos cargar tu perfil. Recarga la página para volver a intentarlo.",
          );
        }
      })
      .finally(() => {
        if (active) setProfileUserId(userId);
      });
    return () => {
      active = false;
    };
  }, [session?.user.id, refresh]);
  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    db.from("pari_events")
      .select("*")
      .eq("status", "published")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at")
      .then(({ data, error }) => {
        if (active) {
          setEvents(data || []);
          setLoading(false);
          if (error) setError(error.message);
        }
      });
    return () => {
      active = false;
    };
  }, [refresh]);
  const go = (v) => {
    setSelected(null);
    setView(v);
    setError("");
    window.scrollTo(0, 0);
  };
  const auth = () => go("profile");
  return (
    <div className="site">
      <div className="announcement">
        Tu próximo gran plan está aquí, en Ticket Pari <span>✦</span>
      </div>
      <header className="site-header">
        <button className="brand" onClick={() => go("discover")}>
          <Ticket />
          <span>
            ticket <b>pari</b>
            <i>®</i>
          </span>
        </button>
        <nav>
          <button
            className={view === "discover" ? "active" : ""}
            onClick={() => go("discover")}
          >
            Descubrir eventos
          </button>
          <button
            className={view === "tickets" ? "active" : ""}
            onClick={() => go("tickets")}
          >
            Mis boletos
          </button>
          <button
            className={view === "saved" ? "active" : ""}
            onClick={() => go("saved")}
          >
            Guardados
          </button>
        </nav>
        <div className="header-actions">
          {mode !== "client" && organizerAllowed && (
            <button className="publish" onClick={() => go("create")}>
              <Plus size={16} />
              Crear evento
            </button>
          )}
          <button className="account" onClick={auth}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Tu foto" />
            ) : (
              <UserRound size={19} />
            )}
            <span>{profile?.full_name?.split(" ")[0] || "Ingresar"}</span>
          </button>
        </div>
      </header>
      <main>
        {!db && (
          <Notice>
            Falta configurar la conexión a Supabase. No se pueden crear cuentas
            ni comprar boletos.
          </Notice>
        )}
        {error && <Notice onClose={() => setError("")}>{error}</Notice>}
        {profileError && (
          <Notice onClose={() => setProfileError("")}>{profileError}</Notice>
        )}
        {!ready ? (
          <Empty title="Conectando con Ticket Pari…" />
        ) : selected ? (
          <EventPage
            key={selected.id}
            event={selected}
            db={db}
            session={session}
            profile={profile}
            back={() => {
              setSelected(null);
              window.scrollTo(0, 0);
            }}
            auth={auth}
            tickets={() => go("tickets")}
            reload={reload}
          />
        ) : view === "discover" ? (
          <Discover
            events={events}
            loading={loading}
            open={(event) => {
              setSelected(event);
              window.scrollTo(0, 0);
            }}
            saved={saved}
            toggleSaved={toggleSaved}
          />
        ) : view === "saved" ? (
          <SavedEvents
            events={events}
            loading={loading}
            saved={saved}
            toggleSaved={toggleSaved}
            open={openEvent}
            explore={() => go("discover")}
          />
        ) : view === "profile" && profileLoading ? (
          <Empty title="Cargando tu perfil…" />
        ) : view === "profile" ? (
          <Profile
            db={db}
            session={session}
            profile={profile}
            reload={reload}
            manage={() => go("manage")}
            organizerAllowed={organizerAllowed}
          />
        ) : !session ? (
          <Auth db={db} />
        ) : view === "tickets" ? (
          <MyTickets db={db} session={session} />
        ) : (view === "create" || view === "manage") && profileLoading ? (
          <Empty title="Comprobando acceso…" />
        ) : (view === "create" || view === "manage") && !organizerAllowed ? (
          <Empty title="Este espacio es para organizadores autorizados">
            <p>
              Descubre tu próximo evento y encuentra tus boletos desde tu
              cuenta.
            </p>
            <button className="primary" onClick={() => go("discover")}>
              Explorar eventos
            </button>
          </Empty>
        ) : view === "create" ? (
          <EventForm
            db={db}
            session={session}
            done={() => {
              reload();
              go("manage");
            }}
            cancel={() => go("manage")}
          />
        ) : view === "manage" ? (
          <Organizer
            db={db}
            session={session}
            profile={profile}
            create={() => go("create")}
            reload={reload}
            refresh={refresh}
            mode={mode}
          />
        ) : null}
      </main>
      <footer>
        <div className="brand">
          <Ticket />
          <span>
            ticket <b>pari</b>
          </span>
        </div>
        <p>Tu próximo plan está aquí.</p>
        <span>Hecho para vivir experiencias · {new Date().getFullYear()}</span>
      </footer>
      <nav className="mobile-nav">
        {[
          ["discover", "Explorar", Search],
          ["tickets", "Boletos", Ticket],
          ["saved", "Guardados", Heart],
          ["profile", "Perfil", UserRound],
        ].map(([v, t, I]) => (
          <button
            key={v}
            className={view === v ? "active" : ""}
            onClick={() => go(v)}
          >
            <I size={21} />
            {t}
          </button>
        ))}
      </nav>
    </div>
  );
}
function Notice({ children, onClose }) {
  return (
    <div className="notice" role="status">
      {children}
      {onClose && (
        <button aria-label="Cerrar aviso" onClick={onClose}>
          <X size={16} />
        </button>
      )}
    </div>
  );
}
function Empty({ title, children }) {
  return (
    <div className="empty">
      <Ticket size={36} />
      <h2>{title}</h2>
      {children}
    </div>
  );
}
function Verified() {
  return (
    <BadgeCheck
      size={19}
      className="verified"
      aria-label="Organizador verificado"
    >
      <title>Organizador verificado</title>
    </BadgeCheck>
  );
}
function Discover({ events, loading, open, saved, toggleSaved }) {
  const [q, setQ] = useState(""),
    [category, setCategory] = useState("Todos"),
    [when, setWhen] = useState("all"),
    [sort, setSort] = useState("date"),
    [city, setCity] = useState("all");
  const filtered = events
    .filter((e) => {
      const day = new Intl.DateTimeFormat("en-CA", {
        timeZone: e.time_zone || "America/Mexico_City",
      }).format(new Date(e.starts_at));
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: e.time_zone || "America/Mexico_City",
      }).format(new Date());
      return (
        (city === "all" || e.city === city) &&
        (category === "Todos" || e.category === category) &&
        (e.title + " " + (e.venue_name || "") + " " + (e.address || ""))
          .toLowerCase()
          .includes(q.toLowerCase()) &&
        (when === "all" ||
          (when === "today" && day === today) ||
          (when === "week" &&
            new Date(e.starts_at) < new Date(Date.now() + 7 * 86400000)))
      );
    })
    .sort((a, b) =>
      sort === "price"
        ? Number(a.ticket_price) - Number(b.ticket_price)
        : new Date(a.starts_at) - new Date(b.starts_at),
    );
  return (
    <>
      <section className="hero">
        <div
          className="hero-image"
          style={{ backgroundImage: `url(${img})` }}
        />
        <div className="hero-content">
          <span className="hero-label">
            <span /> BUENOS PLANES. GRANDES HISTORIAS.
          </span>
          <h1>
            Sal de la rutina.
            <br />
            Entra al <em>plan.</em>
          </h1>
          <p>
            Fiestas, conciertos, stand up y experiencias que se convierten en
            grandes historias.
          </p>
          <button
            className="light-button"
            onClick={() =>
              document
                .getElementById("events")
                .scrollIntoView({ behavior: "smooth" })
            }
          >
            Encuentra tu próximo evento <ArrowUpRight size={19} />
          </button>
          <div className="hero-location">
            <MapPin size={16} /> Ticket Pari, tu próximo plan
          </div>
        </div>
        <div className="hero-sticker">
          <Sparkles />
          <span>
            Nos vemos
            <br />
            <b>afuera.</b>
          </span>
        </div>
        <span className="hero-bottom">
          MÁS MOMENTOS. MENOS “A VER QUÉ HACEMOS”.
        </span>
      </section>
      <section className="catalog" id="events">
        <div className="catalog-top">
          <div>
            <span className="eyebrow">ENCUENTRA TU PRÓXIMO PLAN</span>
            <h2>
              Un boleto. Un gran plan<span>.</span>
            </h2>
          </div>
          <span className="city">
            <MapPin size={16} /> Encuentra tu ciudad
          </span>
        </div>
        <div className="search-bar">
          <Search size={22} />
          <input
            aria-label="Buscar eventos"
            placeholder="Busca un evento, artista o lugar"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            aria-label="Ciudad"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          >
            <option value="all">Ciudad</option>
            {[...new Set(events.map((e) => e.city).filter(Boolean))]
              .sort()
              .map((c) => (
                <option key={c}>{c}</option>
              ))}
          </select>
          <select
            aria-label="Fecha del evento"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
          >
            <option value="all">Cualquier fecha</option>
            <option value="today">Hoy</option>
            <option value="week">Próximos 7 días</option>
          </select>
          <button
            className="primary"
            onClick={() =>
              document
                .getElementById("event-results")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Buscar
          </button>
        </div>
        <div className="categories">
          {cats.map(([c, I]) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={c === category ? "selected" : ""}
            >
              <I size={18} />
              {c}
            </button>
          ))}
        </div>
        <div className="results-heading">
          <h3>
            {category === "Todos"
              ? city === "all"
                ? "Eventos que vienen"
                : `Próximamente en ${city}`
              : category}{" "}
            <span>
              {filtered.length} {filtered.length === 1 ? "evento" : "eventos"}
            </span>
          </h3>
          <label className="sort">
            <SlidersHorizontal size={15} />
            <select
              aria-label="Ordenar eventos"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="date">Más próximos</option>
              <option value="price">Menor precio</option>
            </select>
          </label>
        </div>
        <div id="event-results">
          {loading ? (
            <Empty title="Buscando tus próximos planes…" />
          ) : filtered.length ? (
            <div className="event-grid">
              {filtered.map((e, i) => (
                <EventCard
                  key={e.id}
                  event={e}
                  open={() => open(e)}
                  index={i}
                  saved={saved.includes(e.id)}
                  onSave={() => toggleSaved(e.id)}
                />
              ))}
            </div>
          ) : (
            <Empty
              title={
                events.length
                  ? "No encontramos ese plan"
                  : "Los próximos planes están por llegar"
              }
            >
              <p>
                {events.length
                  ? "Prueba otra categoría, fecha o búsqueda."
                  : "Los próximos eventos aparecerán aquí. Vuelve pronto para descubrir nuevos planes."}
              </p>
              <button
                className="primary"
                onClick={
                  events.length
                    ? () => {
                        setQ("");
                        setCategory("Todos");
                        setWhen("all");
                        setCity("all");
                      }
                    : () => {
                        setQ("");
                        setCategory("Todos");
                        setWhen("all");
                        setCity("all");
                      }
                }
              >
                {events.length ? "Ver todos los eventos" : "Explorar eventos"}
                <ArrowUpRight size={17} />
              </button>
            </Empty>
          )}
        </div>
      </section>
      <section className="organizer-banner attendee-banner">
        <div>
          <span className="eyebrow">MENOS VUELTAS. MÁS PLANES.</span>
          <h2>
            Encuentra el evento.
            <br />
            Vive la <em>experiencia.</em>
          </h2>
          <p>Elige tu plan, compra tus boletos y llévalos siempre contigo.</p>
          <button
            className="primary"
            onClick={() =>
              document
                .getElementById("events")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Descubrir eventos
            <ArrowUpRight size={18} />
          </button>
        </div>
        <div className="decor-ticket">
          <Ticket size={60} />
          <b>
            TU PRÓXIMO
            <br />
            GRAN PLAN
          </b>
          <span>Aquí empieza la historia.</span>
          <i>✦ TICKET PARI ✦</i>
        </div>
      </section>
    </>
  );
}
function EventCard({ event: e, open, index = 0, saved = false, onSave }) {
  const d = new Date(e.starts_at);
  return (
    <article className="event-card">
      <button className="event-open" onClick={open}>
        <div className="card-image">
          <img src={e.image_url || img} alt="" loading="lazy" />
          <span className="card-category">{e.category || "Evento"}</span>
          {e.description?.startsWith("[Evento de ejemplo]") && (
            <span className="example-label">Ejemplo</span>
          )}
          {Number(e.ticket_inventory) === 0 && e.ticket_inventory !== null && (
            <span className="sold-out">Agotado</span>
          )}
          <span className="card-arrow">
            <ArrowUpRight size={20} />
          </span>
        </div>
        <div className="card-body">
          <div className="date-block">
            <b>
              {d.toLocaleDateString("es-MX", {
                day: "2-digit",
                timeZone: e.time_zone || "America/Mexico_City",
              })}
            </b>
            <span>
              {d
                .toLocaleDateString("es-MX", {
                  month: "short",
                  timeZone: e.time_zone || "America/Mexico_City",
                })
                .replace(".", "")}
            </span>
          </div>
          <div className="card-info">
            <h3>{e.title}</h3>
            <p>
              <MapPin size={13} />
              {e.venue_name || e.city || "Lugar por confirmar"}
            </p>
            <small>
              {d.toLocaleTimeString("es-MX", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: e.time_zone || "America/Mexico_City",
              })}{" "}
              · {e.city}
            </small>
          </div>
        </div>
        <div className="card-footer">
          <span>
            {e.organizer_name || "Ticket Pari"}
            {e.organizer_verified && <Verified />}
          </span>
          <b>
            {Number(e.ticket_price) ? money(e.ticket_price) : "Gratis"}
            <small> MXN</small>
          </b>
        </div>
      </button>
      {onSave && (
        <button
          className={"save-event " + (saved ? "is-saved" : "")}
          aria-label={
            saved ? `Quitar ${e.title} de guardados` : `Guardar ${e.title}`
          }
          aria-pressed={saved}
          onClick={onSave}
        >
          <Heart size={19} fill={saved ? "currentColor" : "none"} />
        </button>
      )}
    </article>
  );
}
function SavedEvents({ events, loading, saved, toggleSaved, open, explore }) {
  const items = events.filter((e) => saved.includes(e.id));
  return (
    <section className="content-section saved-page">
      <span className="eyebrow">LOS PLANES QUE TE GUSTAN</span>
      <h1>Guardados</h1>
      <p className="muted">
        Marca el corazón de un evento para volver a encontrarlo aquí. Los
        guardados se conservan en este dispositivo.
      </p>
      {loading ? (
        <Empty title="Buscando tus eventos…" />
      ) : items.length ? (
        <div className="event-grid">
          {items.map((e) => (
            <EventCard
              key={e.id}
              event={e}
              open={() => open(e)}
              saved
              onSave={() => toggleSaved(e.id)}
            />
          ))}
        </div>
      ) : (
        <Empty title="Guarda ese plan que no te quieres perder">
          <p>Explora los eventos y toca el corazón de tus favoritos.</p>
          <button className="primary" onClick={explore}>
            Explorar eventos
            <ArrowUpRight size={17} />
          </button>
        </Empty>
      )}
    </section>
  );
}
function Auth({ db }) {
  const [signup, setSignup] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    if (!db) return;
    setBusy(true);
    setError("");
    setMessage("");
    const f = new FormData(e.currentTarget);
    try {
      const { error } = signup
        ? await db.auth.signUp({
            email: f.get("email"),
            password: f.get("password"),
            options: {
              data: { full_name: f.get("name"), phone: f.get("phone") },
            },
          })
        : await db.auth.signInWithPassword({
            email: f.get("email"),
            password: f.get("password"),
          });
      if (error) throw error;
      if (signup)
        setMessage(
          "Cuenta creada. Revisa tu correo si necesitas confirmar tu cuenta.",
        );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout">
      <div className="auth-art">
        <span className="eyebrow">BIENVENIDO A TU PRÓXIMO PLAN</span>
        <h1>
          Hay noches
          <br />
          que empiezan
          <br />
          con un <em>boleto.</em>
        </h1>
        <Ticket size={90} />
        <p>Descubre, compra y vive tu próximo plan.</p>
      </div>
      <form className="auth-form" onSubmit={submit}>
        <span className="eyebrow">TU CUENTA TICKET PARI</span>
        <h2>{signup ? "Hagamos planes." : "Qué bueno verte."}</h2>
        <p>
          {signup
            ? "Una cuenta para descubrir eventos y guardar tus boletos."
            : "Entra para ver tus boletos y tus eventos guardados."}
        </p>
        {signup && (
          <>
            <Field label="Nombre" name="name" autoComplete="name" required />
            <Field label="Celular" name="phone" type="tel" autoComplete="tel" />
          </>
        )}
        <Field
          label="Correo electrónico"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
        <Field
          label="Contraseña"
          name="password"
          type="password"
          minLength={8}
          autoComplete={signup ? "new-password" : "current-password"}
          required
        />
        {error && <Notice>{error}</Notice>}
        {message && <Notice>{message}</Notice>}
        <button className="primary" disabled={!db || busy}>
          {busy ? "Un momento…" : signup ? "Crear mi cuenta" : "Iniciar sesión"}
          <ArrowUpRight size={18} />
        </button>
        <button
          type="button"
          className="text-button"
          onClick={() => {
            setSignup(!signup);
            setError("");
            setMessage("");
          }}
        >
          {signup
            ? "Ya tengo cuenta. Iniciar sesión"
            : "¿Primera vez por aquí? Crea tu cuenta"}
        </button>
      </form>
    </div>
  );
}
function Field({ label, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...props} />
    </label>
  );
}
function Profile({ db, session, profile, reload, manage, organizerAllowed }) {
  const [editing, setEditing] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (!session) return <Auth db={db} />;
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      let avatar = profile?.avatar_url;
      const file = f.get("avatar");
      if (file?.size) {
        if (file.size > 5 * 1024 * 1024)
          throw Error("La foto debe pesar menos de 5 MB.");
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
          throw Error("Usa una imagen JPG, PNG o WebP.");
        const path = `avatars/${session.user.id}/${crypto.randomUUID()}.${file.type.split("/")[1]}`;
        const { error } = await db.storage
          .from("pari-media")
          .upload(path, file);
        if (error) throw error;
        avatar = db.storage.from("pari-media").getPublicUrl(path)
          .data.publicUrl;
      }
      const { error } = await db
        .from("pari_profiles")
        .update({
          full_name: f.get("name"),
          phone: f.get("phone"),
          avatar_url: avatar,
        })
        .eq("id", session.user.id);
      if (error) throw error;
      reload();
      setEditing(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="narrow">
      <span className="eyebrow">MI CUENTA</span>
      <h1>Tu perfil</h1>
      {error && <Notice>{error}</Notice>}
      <div className="profile-card">
        <div className="avatar-large">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Tu foto de perfil" />
          ) : (
            <UserRound size={42} />
          )}
        </div>
        <h2>
          {profile?.full_name || "Tu perfil"}
          {profile?.is_verified && <Verified />}
        </h2>
        <p>{session.user.email}</p>
        <p>{profile?.phone}</p>
        {profile?.verification_requested && !profile?.is_verified && (
          <span className="badge">Verificación en revisión</span>
        )}
      </div>
      {editing ? (
        <form className="panel form-grid" onSubmit={save}>
          <Field
            label="Nombre"
            name="name"
            defaultValue={profile?.full_name}
            required
          />
          <Field
            label="Celular"
            name="phone"
            type="tel"
            defaultValue={profile?.phone}
          />
          <Field
            label="Foto de perfil"
            name="avatar"
            type="file"
            accept="image/jpeg,image/png,image/webp"
          />
          <button className="primary" disabled={busy}>
            {busy ? "Guardando…" : "Guardar cambios"}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => setEditing(false)}
          >
            Cancelar
          </button>
        </form>
      ) : (
        <div className="profile-actions">
          <button className="secondary" onClick={() => setEditing(true)}>
            Editar perfil
          </button>
          {organizerAllowed && (
            <button className="primary" onClick={manage}>
              Administrar mis eventos
              <ArrowUpRight size={16} />
            </button>
          )}
          {organizerAllowed &&
            !profile?.is_verified &&
            !profile?.verification_requested && (
              <button
                className="secondary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  const { error } = await db
                    .from("pari_profiles")
                    .update({ verification_requested: true })
                    .eq("id", session.user.id);
                  if (error) setError(error.message);
                  else reload();
                  setBusy(false);
                }}
              >
                <BadgeCheck size={17} />
                Solicitar verificación de organizador
              </button>
            )}
          <button className="text-button" onClick={() => db.auth.signOut()}>
            <LogOut size={17} />
            Cerrar sesión
          </button>
        </div>
      )}
    </section>
  );
}
function EventPage({
  event: e,
  db,
  session,
  profile,
  back,
  auth,
  tickets,
  reload,
}) {
  const [qty, setQty] = useState(1),
    [checkout, setCheckout] = useState(false),
    [order, setOrder] = useState(null);
  if (order)
    return (
      <section className="narrow success">
        <span className="success-icon">
          <Check size={36} />
        </span>
        <span className="eyebrow">COMPRA SIMULADA CONFIRMADA</span>
        <h1>¡Ya tienes plan!</h1>
        <p>
          {qty} boleto{qty > 1 ? "s" : ""} para {e.title}
        </p>
        <TicketReceipt order={{ ...order, pari_events: e }} />
        <p className="muted">No se realizó ningún cargo real.</p>
        <button className="primary" onClick={tickets}>
          Ver mis boletos
          <ArrowUpRight size={18} />
        </button>
      </section>
    );
  if (checkout)
    return (
      <Checkout
        event={e}
        initialQuantity={qty}
        session={session}
        profile={profile}
        db={db}
        onBack={(quantity) => {
          setQty(quantity);
          setCheckout(false);
          window.scrollTo(0, 0);
        }}
        onSuccess={(data) => {
          setOrder(data);
          setQty(data.quantity);
          setCheckout(false);
          reload();
          window.scrollTo(0, 0);
        }}
        renderAuth={() => <Auth db={db} />}
      />
    );
  const soldOut =
    e.ticket_inventory !== null && Number(e.ticket_inventory) === 0;
  return (
    <section className="detail">
      <button className="back-button" onClick={back}>
        <ArrowLeft size={17} />
        Todos los eventos
      </button>
      <div className="detail-cover">
        <img src={e.image_url || img} alt={e.title} />
        <span>{e.category || "Evento"}</span>
      </div>
      <div className="detail-layout">
        <div className="detail-copy">
          <span className="eyebrow">ESTE PLAN ES PARA TI</span>
          <h1>{e.title}</h1>
          <div className="organizer-line">
            Organizado por <b>{e.organizer_name || "Ticket Pari"}</b>
            {e.organizer_verified && <Verified />}
          </div>
          <div className="event-facts">
            <div>
              <CalendarDays />
              <span>
                <b>{date(e.starts_at, e.time_zone)}</b>
                <small>
                  Hora local del evento · {e.time_zone || "America/Mexico_City"}
                </small>
              </span>
            </div>
            <div>
              <MapPin />
              <span>
                <b>{e.venue_name || e.city || "Lugar por confirmar"}</b>
                <small>{e.address || "Ubicación por confirmar"}</small>
              </span>
            </div>
          </div>
          <h2>Acerca de este evento</h2>
          <p className="description">
            {e.description ||
              "Prepárate para vivir una experiencia en la ciudad."}
          </p>
        </div>
        <div className="checkout panel event-ticket-panel">
          <span className="eyebrow">TU ACCESO AL PLAN</span>
          <h2>Acceso general</h2>
          <strong>
            {money(e.ticket_price)}
            <small> MXN / boleto</small>
          </strong>
          <div className="quantity">
            <span>Boletos</span>
            <div>
              <button
                type="button"
                aria-label="Quitar boleto"
                disabled={qty <= 1}
                onClick={() => setQty((q) => q - 1)}
              >
                <Minus size={16} />
              </button>
              <b>{qty}</b>
              <button
                type="button"
                aria-label="Agregar boleto"
                disabled={qty >= Math.min(10, e.ticket_inventory ?? 10)}
                onClick={() => setQty((q) => q + 1)}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
          {e.ticket_inventory !== null && (
            <p className="muted">
              {soldOut
                ? "Boletos agotados"
                : `${e.ticket_inventory} boletos disponibles`}
            </p>
          )}
          <div className="checkout-total">
            <span>Total</span>
            <b>{money(Number(e.ticket_price) * qty)} MXN</b>
          </div>
          <button
            className="primary"
            disabled={soldOut || !db}
            onClick={() => {
              setCheckout(true);
              window.scrollTo(0, 0);
            }}
          >
            {soldOut ? "Agotado" : "Comprar boletos"}
            <ArrowUpRight size={18} />
          </button>
          <small className="secure-note">
            Boletos digitales en tu perfil · Sin cargos adicionales
          </small>
        </div>
      </div>
    </section>
  );
}
function TicketReceipt({ order: o }) {
  return (
    <article className="receipt">
      <div className="receipt-head">
        <Ticket />
        <span>{o.is_demo ? "BOLETO DE PRUEBA" : "TICKET PARI"}</span>
        <b>{o.status === "paid" ? "Confirmado" : o.status}</b>
      </div>
      <h3>{o.pari_events?.title || "Evento"}</h3>
      {o.pari_events?.starts_at && (
        <p>{date(o.pari_events.starts_at, o.pari_events.time_zone)}</p>
      )}
      <p>
        {o.quantity} acceso{o.quantity > 1 ? "s" : ""} · {money(o.total)} MXN
      </p>
      {o.attendee_name && (
        <p>
          <b>Asistente:</b> {o.attendee_name}
        </p>
      )}
      <div className="ticket-code">
        <span>CÓDIGO DE ACCESO</span>
        <code>{o.qr_token}</code>
      </div>
      <small>
        Orden {o.id} {o.checked_in_at ? "· Ingreso registrado" : ""}
      </small>
    </article>
  );
}
function MyTickets({ db, session }) {
  const [orders, setOrders] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    db.from("pari_ticket_orders")
      .select("*,pari_events(title,starts_at,venue_name,time_zone)")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        setOrders(data || []);
        if (error) setError(error.message);
      });
  }, [session.user.id]);
  return (
    <section className="content-section">
      <span className="eyebrow">TUS PRÓXIMAS HISTORIAS</span>
      <h1>Mis boletos</h1>
      {error && <Notice>{error}</Notice>}
      {orders === null ? (
        <Empty title="Cargando tus boletos…" />
      ) : orders.length ? (
        <div className="tickets-grid">
          {orders.map((o) => (
            <TicketReceipt key={o.id} order={o} />
          ))}
        </div>
      ) : (
        <Empty title="Tu próximo plan te espera">
          <p>Los boletos que compres aparecerán aquí.</p>
        </Empty>
      )}
    </section>
  );
}
function EventForm({ db, session, event, done, cancel }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [preview, setPreview] = useState(event?.image_url || "");
  useEffect(
    () => () => {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  async function save(ev) {
    ev.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(ev.currentTarget);
    try {
      let image = event?.image_url || null;
      const file = f.get("image");
      if (file?.size) {
        if (file.size > 8 * 1024 * 1024)
          throw Error("La portada debe pesar menos de 8 MB.");
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
          throw Error("La portada debe ser JPG, PNG o WebP.");
        const path = `events/${session.user.id}/${crypto.randomUUID()}.${file.type.split("/")[1]}`;
        const { error } = await db.storage
          .from("pari-media")
          .upload(path, file);
        if (error) throw error;
        image = db.storage.from("pari-media").getPublicUrl(path).data.publicUrl;
      }
      const zone = f.get("time_zone");
      const start = new Date(utcFromLocal(f.get("starts_at"), zone));
      const end = f.get("ends_at")
        ? new Date(utcFromLocal(f.get("ends_at"), zone))
        : null;
      if (end && end <= start)
        throw Error("La fecha de fin debe ser posterior al inicio.");
      const payload = {
        title: f.get("title").trim(),
        description: f.get("description"),
        venue_name: f.get("venue_name"),
        address: f.get("address"),
        city: f.get("city").trim(),
        time_zone: zone,
        starts_at: start.toISOString(),
        ends_at: end?.toISOString() || null,
        category: f.get("category"),
        ticket_price: Number(f.get("price")),
        ticket_inventory: Number(f.get("inventory")),
        image_url: image,
        status: f.get("status"),
        type: "other",
      };
      if (!event) payload.organizer_id = session.user.id;
      const { error } = event
        ? await db.from("pari_events").update(payload).eq("id", event.id)
        : await db.from("pari_events").insert(payload);
      if (error) throw error;
      done();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="narrow wide-form">
      <button className="back-button" onClick={cancel}>
        <ArrowLeft size={16} />
        Mis eventos
      </button>
      <span className="eyebrow">EL PRÓXIMO GRAN PLAN LO CREAS TÚ</span>
      <h1>{event ? "Edita tu evento" : "Dale vida a tu evento."}</h1>
      <p className="muted">
        Publica en la ciudad que quieras. Los pagos están en modo de prueba.
      </p>
      <form onSubmit={save} className="event-form">
        <section className="panel">
          <h2>01 · Lo que lo hace único</h2>
          <Field
            label="Nombre del evento"
            name="title"
            defaultValue={event?.title}
            maxLength={150}
            required
          />
          <label className="field">
            <span>Categoría</span>
            <select name="category" defaultValue={event?.category || "Música"}>
              {cats.slice(1).map(([c]) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Cuéntanos de qué va</span>
            <textarea
              name="description"
              rows={5}
              defaultValue={event?.description}
              required
            />
          </label>
          <label className="image-upload">
            {preview ? (
              <img src={preview} alt="Vista previa de portada" />
            ) : (
              <>
                <ImagePlus size={32} />
                <b>Una portada que invite a ir</b>
                <span>JPG, PNG o WebP · máximo 8 MB</span>
              </>
            )}
            <input
              type="file"
              name="image"
              accept="image/jpeg,image/png,image/webp"
              onChange={(ev) => {
                const f = ev.target.files?.[0];
                if (f) setPreview(URL.createObjectURL(f));
              }}
            />
            <span>{preview ? "Cambiar portada" : "Seleccionar portada"}</span>
          </label>
        </section>
        <section className="panel">
          <h2>02 · Cuándo y dónde</h2>
          <div className="form-grid">
            <Field
              label="Inicio (hora local del evento)"
              type="datetime-local"
              name="starts_at"
              defaultValue={localInZone(event?.starts_at, event?.time_zone)}
              required
            />
            <Field
              label="Fin (hora local, opcional)"
              type="datetime-local"
              name="ends_at"
              defaultValue={localInZone(event?.ends_at, event?.time_zone)}
            />
            <label className="field">
              <span>Zona horaria del evento</span>
              <select
                name="time_zone"
                defaultValue={event?.time_zone || "America/Mexico_City"}
              >
                {zones.map((z) => (
                  <option key={z}>{z}</option>
                ))}
              </select>
            </label>
            <Field
              label="Nombre del lugar"
              name="venue_name"
              defaultValue={event?.venue_name}
              required
            />
            <Field
              label="Ciudad"
              name="city"
              defaultValue={event?.city || "Ciudad de México"}
              maxLength={100}
              required
            />
            <Field
              label="Dirección"
              name="address"
              defaultValue={event?.address}
              required
            />
          </div>
        </section>
        <section className="panel">
          <h2>03 · Los boletos</h2>
          <div className="form-grid">
            <Field
              label="Precio por boleto (MXN)"
              name="price"
              type="number"
              min="0"
              max="1000000"
              step="0.01"
              defaultValue={event?.ticket_price || 0}
              required
            />
            <Field
              label="Boletos disponibles para venta"
              name="inventory"
              type="number"
              min="0"
              max="1000000"
              step="1"
              defaultValue={event?.ticket_inventory ?? 100}
              required
            />
          </div>
          <p className="muted">
            La disponibilidad disminuye con cada compra. Editar este número
            cambia los boletos que aún se pueden vender.
          </p>
          <label className="field">
            <span>Visibilidad</span>
            <select name="status" defaultValue={event?.status || "draft"}>
              <option value="draft">Borrador · solo tú puedes verlo</option>
              <option value="published">
                Publicado · visible en el catálogo
              </option>
              <option value="cancelled">Cancelado · no admite compras</option>
            </select>
          </label>
        </section>
        {error && <Notice>{error}</Notice>}
        <div className="form-actions">
          <button type="button" className="secondary" onClick={cancel}>
            Cancelar
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Guardando…" : event ? "Guardar cambios" : "Crear evento"}
            <ArrowUpRight size={18} />
          </button>
        </div>
      </form>
    </section>
  );
}
function Organizer({ db, session, profile, create, reload, refresh, mode }) {
  const [events, setEvents] = useState([]),
    [orders, setOrders] = useState([]),
    [users, setUsers] = useState([]),
    [tab, setTab] = useState("events"),
    [edit, setEdit] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [eventFilter, setEventFilter] = useState("all"),
    [code, setCode] = useState(""),
    [message, setMessage] = useState("");
  const admin = profile?.role === "admin";
  useEffect(() => {
    let active = true;
    if (mode === "admin" && !profile) return;
    if (mode === "admin" && !admin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        let query = db
          .from("pari_events")
          .select("*")
          .order("created_at", { ascending: false });
        if (!admin) {
          const { data: members, error } = await db
            .from("pari_venue_members")
            .select("venue_id")
            .eq("user_id", session.user.id);
          if (error) throw error;
          const ids = (members || []).map((m) => m.venue_id);
          query = query.or(
            `organizer_id.eq.${session.user.id}${ids.length ? `,venue_id.in.(${ids.join(",")})` : ""}`,
          );
        }
        const { data: es, error } = await query;
        if (error) throw error;
        const ids = (es || []).map((e) => e.id);
        const { data: os, error: oe } = ids.length
          ? await db
              .from("pari_ticket_orders")
              .select("*")
              .in("event_id", ids)
              .order("created_at", { ascending: false })
          : { data: [] };
        if (oe) throw oe;
        let us = [];
        if (admin) {
          const { data, error } = await db
            .from("pari_profiles")
            .select("*")
            .order("created_at", { ascending: false });
          if (error) throw error;
          us = data || [];
        }
        if (active) {
          setEvents(es || []);
          setOrders(os || []);
          setUsers(us);
        }
      } catch (e) {
        if (active) setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [session.user.id, profile?.role, refresh, admin]);
  async function verify(user) {
    setBusy(true);
    setError("");
    const { error } = await db.rpc("pari_set_verified", {
      p_user_id: user.id,
      p_verified: !user.is_verified,
    });
    if (error) setError(error.message);
    else reload();
    setBusy(false);
  }
  async function authorizeOrganizer(user) {
    setBusy(true);
    setError("");
    const { error } = await db.rpc("pari_set_organizer", {
      p_user_id: user.id,
      p_enabled: user.role !== "business",
    });
    if (error) setError(error.message);
    else reload();
    setBusy(false);
  }
  async function checkin(ev) {
    ev.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const { data, error } = await db.rpc("pari_check_in", {
      p_token: code.trim(),
    });
    if (error) setError(error.message);
    else {
      setMessage(
        `Acceso confirmado: ${data.quantity} boleto(s). Orden ${data.id.slice(0, 8)}.`,
      );
      setCode("");
      reload();
    }
    setBusy(false);
  }
  const paid = orders.filter((o) => o.status === "paid"),
    sold = paid.reduce((n, o) => n + o.quantity, 0),
    total = paid.reduce((n, o) => n + Number(o.total), 0),
    rows = orders.filter(
      (o) => eventFilter === "all" || o.event_id === eventFilter,
    );
  if (mode === "admin" && profile && profile.role !== "admin")
    return (
      <Empty title="Acceso exclusivo para administradores">
        <p>
          Este panel está reservado a las cuentas autorizadas por Ticket Pari.
        </p>
      </Empty>
    );
  if (edit)
    return (
      <EventForm
        db={db}
        session={session}
        event={edit}
        done={() => {
          setEdit(null);
          reload();
        }}
        cancel={() => setEdit(null)}
      />
    );
  return (
    <section className="content-section dashboard">
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            {admin
              ? "TICKET PARI · ADMINISTRACIÓN"
              : "TU CENTRO DE OPERACIONES"}
          </span>
          <h1>{admin ? "Control de la plataforma" : "Hagamos que suceda."}</h1>
          <p className="muted">
            {profile?.full_name || "Organizador"}
            {profile?.is_verified && <Verified />} · Gestiona cada detalle de tu
            evento.
          </p>
        </div>
        <button className="primary" onClick={create}>
          <Plus size={18} />
          Crear evento
        </button>
      </div>
      <div className="stats">
        <div>
          <span>Eventos</span>
          <b>{events.length}</b>
          <small>
            {events.filter((e) => e.status === "published").length} publicados
          </small>
        </div>
        <div>
          <span>Boletos vendidos</span>
          <b>{sold}</b>
          <small>Compras confirmadas</small>
        </div>
        <div>
          <span>Ventas simuladas</span>
          <b>{money(total)}</b>
          <small>MXN · sin cobros reales</small>
        </div>
        <div>
          <span>Accesos registrados</span>
          <b>
            {paid
              .filter((o) => o.checked_in_at)
              .reduce((n, o) => n + o.quantity, 0)}
          </b>
          <small>Boletos con ingreso</small>
        </div>
      </div>
      <div className="dashboard-tabs">
        {[
          ["events", "Mis eventos"],
          ["orders", "Ventas y asistentes"],
          ["checkin", "Control de acceso"],
          ...(admin ? [["users", "Accesos y verificación"]] : []),
        ].map(([id, t]) => (
          <button
            key={id}
            className={tab === id ? "selected" : ""}
            onClick={() => {
              setTab(id);
              setError("");
              setMessage("");
            }}
          >
            {t}
          </button>
        ))}
      </div>
      {error && <Notice>{error}</Notice>}
      {message && <Notice>{message}</Notice>}
      {loading ? (
        <Empty title="Cargando tu panel…" />
      ) : tab === "events" ? (
        events.length ? (
          <div className="managed-events">
            {events.map((e) => (
              <article key={e.id}>
                <img src={e.image_url || img} alt="" />
                <div>
                  <span className={"badge " + e.status}>
                    {
                      {
                        draft: "Borrador",
                        published: "Publicado",
                        cancelled: "Cancelado",
                      }[e.status]
                    }
                  </span>
                  <h3>{e.title}</h3>
                  <p>
                    {date(e.starts_at, e.time_zone)} · {e.venue_name}
                  </p>
                  <small>
                    {orders
                      .filter((o) => o.event_id === e.id && o.status === "paid")
                      .reduce((n, o) => n + o.quantity, 0)}{" "}
                    vendidos · {e.ticket_inventory ?? "Sin límite"} disponibles
                    · {money(e.ticket_price)} MXN
                  </small>
                </div>
                <button className="secondary" onClick={() => setEdit(e)}>
                  Administrar
                  <ChevronRight size={16} />
                </button>
              </article>
            ))}
          </div>
        ) : (
          <Empty title="Tu primer evento empieza aquí">
            <p>Publica una fiesta, un show o esa idea que traes en mente.</p>
            <button className="primary" onClick={create}>
              Crear evento
              <Plus size={17} />
            </button>
          </Empty>
        )
      ) : tab === "orders" ? (
        <section className="panel">
          <div className="panel-heading">
            <h2>Ventas y asistentes</h2>
            <select
              aria-label="Filtrar ventas por evento"
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
            >
              <option value="all">Todos mis eventos</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </select>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Orden</th>
                  <th>Evento</th>
                  <th>Asistente</th>
                  <th>Boletos</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Ingreso</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id}>
                    <td>
                      {o.id.slice(0, 8).toUpperCase()}
                      <small>{date(o.created_at)}</small>
                    </td>
                    <td>{events.find((e) => e.id === o.event_id)?.title}</td>
                    <td>
                      {o.attendee_name || "Sin datos de asistente"}
                      <small>{o.attendee_email}</small>
                    </td>
                    <td>{o.quantity}</td>
                    <td>{money(o.total)}</td>
                    <td>
                      <span className="badge">
                        {o.status === "paid" ? "Confirmada" : o.status}
                      </span>
                      {o.is_demo && <small>Prueba</small>}
                    </td>
                    <td>{o.checked_in_at ? "Registrado" : "Sin ingreso"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && (
              <p className="muted">
                Todavía no hay compras para esta selección.
              </p>
            )}
          </div>
        </section>
      ) : tab === "checkin" ? (
        <form className="panel checkin" onSubmit={checkin}>
          <ScanLine size={40} />
          <h2>Bienvenidos al plan.</h2>
          <p>
            Introduce el código de acceso que aparece en el boleto. Cada orden
            permite un solo ingreso para todo el grupo.
          </p>
          <Field
            label="Código de acceso"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Código completo del boleto"
            required
          />
          <button className="primary" disabled={busy}>
            {busy ? "Validando…" : "Validar y registrar ingreso"}
            <Check size={17} />
          </button>
        </form>
      ) : tab === "users" ? (
        <section className="panel">
          <h2>Accesos y verificación</h2>
          <p className="muted">
            Autoriza solo a los organizadores que podrán crear y administrar
            eventos. La palomita de identidad se gestiona por separado.
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Acceso para organizar</th>
                  <th>Solicitud</th>
                  <th>Verificación</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      {u.full_name || "Sin nombre"}
                      {u.is_verified && <Verified />}
                      <small>{u.email}</small>
                    </td>
                    <td>
                      {u.role === "admin"
                        ? "Administrador"
                        : u.role === "business"
                          ? "Autorizado"
                          : "Solo asistente"}
                      {u.role !== "admin" && (
                        <button
                          className="secondary"
                          disabled={busy}
                          onClick={() => authorizeOrganizer(u)}
                        >
                          {u.role === "business"
                            ? "Retirar acceso"
                            : "Autorizar organizador"}
                        </button>
                      )}
                    </td>
                    <td>
                      {u.verification_requested
                        ? "Solicitada"
                        : "Sin solicitud"}
                    </td>
                    <td>{u.is_verified ? "Verificado" : "Sin verificar"}</td>
                    <td>
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={() => verify(u)}
                      >
                        {u.is_verified
                          ? "Quitar verificación"
                          : "Verificar organizador"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </section>
  );
}
