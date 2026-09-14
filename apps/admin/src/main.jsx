import React,{useEffect,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {LayoutDashboard,Building2,Users,Ticket,WalletCards,ShieldCheck,Search,MoreHorizontal,Database} from 'lucide-react'
import './styles.css'
import {supabase,isSupabaseConfigured} from './supabase'

function App(){
 const [pari_venues,setVenues]=useState([]);const [pari_events,setEvents]=useState([]);const [loading,setLoading]=useState(true)
 useEffect(()=>{if(!supabase){setLoading(false);return}(async()=>{const [{data:v},{data:e}]=await Promise.all([supabase.from('pari_venues').select('*').order('name'),supabase.from('pari_events').select('id,status')]);setVenues(v||[]);setEvents(e||[]);setLoading(false)})()},[])
 return <div className="wrap"><aside><div className="brand">pari<span>.</span><small>ADMIN</small></div>{[[LayoutDashboard,'Dashboard'],[Building2,'Negocios'],[Users,'Usuarios'],[Ticket,'Eventos'],[WalletCards,'Pagos'],[ShieldCheck,'Moderación']].map(([I,t],i)=><button key={t} className={i===0?'active':''}><I/>{t}</button>)}</aside><main><header><div><p>PARI CONTROL CENTER · {isSupabaseConfigured?'SUPABASE':'DEMO'}</p><h1>Dashboard</h1></div><div className="search"><Search/><input placeholder="Buscar..."/></div></header><div className="kpis"><article><span>Base de datos</span><b>{isSupabaseConfigured?'Conectada':'Sin ENV'}</b></article><article><span>Negocios</span><b>{loading?'…':pari_venues.length}</b></article><article><span>Eventos</span><b>{loading?'…':pari_events.length}</b></article><article><span>Publicados</span><b>{loading?'…':pari_events.filter(e=>e.status==='published').length}</b></article></div><section><div className="section-head"><div><h2>Negocios</h2><p>Datos reales de Supabase</p></div><button><Database size={15}/> Base conectada</button></div><table><thead><tr><th>Negocio</th><th>Ciudad</th><th>Estado</th><th>Correo</th><th>Slug</th><th></th></tr></thead><tbody>{pari_venues.length?pari_venues.map(v=><tr key={v.id}><td>{v.name}</td><td>{v.city}</td><td><span className="status">{v.is_active?'Activo':'Inactivo'}</span></td><td>{v.contact_email||'—'}</td><td>{v.slug}</td><td><MoreHorizontal/></td></tr>):<tr><td colSpan="6">{loading?'Cargando…':'No hay negocios visibles.'}</td></tr>}</tbody></table></section></main></div>
}
createRoot(document.getElementById('root')).render(<App/>)
