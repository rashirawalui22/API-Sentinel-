import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Activity, Bell, ChevronRight, CircleAlert, Clock3, Gauge, LayoutDashboard, Menu, Plus, Settings, ShieldCheck, X, Trash2, Pencil, CheckCircle2, Radio, LogOut } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import axios from 'axios'
import { Link, useLocation } from 'react-router-dom'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
const demoMonitors = [
  { _id: 'demo-1', name: 'Public API', url: 'https://api.example.com/v1/status', method: 'GET', interval: 60, status: 'operational', responseTime: 128, uptime: 99.99 },
  { _id: 'demo-2', name: 'Authentication', url: 'https://api.example.com/v1/auth', method: 'POST', interval: 60, status: 'operational', responseTime: 184, uptime: 99.98 },
  { _id: 'demo-3', name: 'Payments', url: 'https://api.example.com/v1/payments', method: 'GET', interval: 30, status: 'down', responseTime: 842, uptime: 98.42 },
]
const chartData = [{ time:'00:00', response:142 },{ time:'04:00', response:168 },{ time:'08:00', response:132 },{ time:'12:00', response:205 },{ time:'16:00', response:176 },{ time:'20:00', response:154 }]

function Brand() {
  return <Link className="brand" to="/"><span className="brand-mark"><ShieldCheck size={17}/></span><span>API Sentinel</span></Link>
}

function Landing() {
  return <main>
    <nav className="nav"><Brand/><div className="nav-links"><a href="#features">Features</a><a href="#how">How it works</a></div><Link className="button small" to="/dashboard">Open dashboard</Link></nav>
    <section className="hero-section">
      <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}>
        <div className="eyebrow"><Radio size={13}/> Monitoring is operational</div>
        <h1>Your APIs.<br/><span>Under control.</span></h1>
        <p className="hero-copy">Monitor endpoint health, response times, and incidents from one focused control center.</p>
        <div className="hero-actions"><Link className="button" to="/dashboard">Get started <ChevronRight size={16}/></Link><a className="button secondary" href="#features">Explore features</a></div>
      </motion.div>
      <motion.div className="hero-preview" initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} transition={{delay:.12}}>
        <div className="preview-top"><div className="window-dots"><i/><i/><i/></div><span>api-sentinel / overview</span></div>
        <div className="preview-grid">
          <div className="preview-stat"><span>Monitored</span><strong>24</strong><small>All services</small></div>
          <div className="preview-stat"><span>Uptime</span><strong>99.98%</strong><small className="positive">+0.02%</small></div>
          <div className="preview-stat"><span>Avg. latency</span><strong>164ms</strong><small>Last 24h</small></div>
          <div className="preview-chart"><div className="preview-chart-head"><span>Response time</span><small>24 hours</small></div><ResponsiveContainer width="100%" height="82%"><AreaChart data={chartData}><defs><linearGradient id="previewFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#A78BFA" stopOpacity=".28"/><stop offset="100%" stopColor="#A78BFA" stopOpacity="0"/></linearGradient></defs><Area type="monotone" dataKey="response" stroke="#A78BFA" strokeWidth={2} fill="url(#previewFill)"/></AreaChart></ResponsiveContainer></div>
        </div>
      </motion.div>
    </section>
    <section className="features" id="features"><div className="section-heading"><span>Everything you need</span><h2>Clarity for every request.</h2></div><div className="feature-grid">
      {[['Always-on monitoring','Scheduled checks catch slowdowns and outages before users do.',Activity],['Response intelligence','Track latency and uptime trends across every endpoint.',Gauge],['Actionable alerts','Get notified by email the moment an endpoint changes state.',Bell]].map(([title,copy,Icon])=><article className="feature-card" key={title}><Icon size={20}/><h3>{title}</h3><p>{copy}</p></article>)}
    </div></section>
    <section className="how" id="how"><div className="section-heading"><span>How it works</span><h2>Three steps to visibility.</h2></div><div className="steps"><div><b>01</b><h3>Add an endpoint</h3><p>Configure the URL, method, and check interval.</p></div><div><b>02</b><h3>We run the checks</h3><p>API Sentinel measures availability and latency.</p></div><div><b>03</b><h3>Resolve faster</h3><p>Review incidents and receive recovery alerts.</p></div></div></section>
    <footer><Brand/><p>Monitor with confidence.</p></footer>
  </main>
}

function Metric({label,value,detail,icon:Icon,tone=''}) {
  return <article className="metric-card"><div className="metric-label"><span>{label}</span><Icon size={16}/></div><strong>{value}</strong><small className={tone}>{detail}</small></article>
}
function Status({status}) {
  return <span className={`status ${status==='down'?'down':'operational'}`}><i/>{status==='down'?'Down':'Operational'}</span>
}
function MonitorModal({monitor,onClose,onSave}) {
  const [form,setForm]=useState({name:monitor?.name||'',url:monitor?.url||'',method:monitor?.method||'GET',interval:monitor?.interval||60})
  const [error,setError]=useState('')
  const submit=e=>{e.preventDefault();if(!form.name.trim()||!/^https?:\/\//i.test(form.url)){setError('Enter a name and valid HTTP(S) URL.');return}onSave({...form,interval:Number(form.interval)})}
  return <div className="modal-backdrop" onMouseDown={onClose}><motion.form className="modal" initial={{opacity:0,scale:.97}} animate={{opacity:1,scale:1}} onSubmit={submit} onMouseDown={e=>e.stopPropagation()}>
    <div className="modal-head"><div><span>Endpoint</span><h2>{monitor?'Edit monitor':'Add monitor'}</h2></div><button type="button" onClick={onClose}><X size={18}/></button></div>
    {error&&<div className="form-error"><CircleAlert size={15}/>{error}</div>}
    <label>Name<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Public API"/></label>
    <label>URL<input value={form.url} onChange={e=>setForm({...form,url:e.target.value})} placeholder="https://api.example.com/health"/></label>
    <div className="form-row"><label>Method<select value={form.method} onChange={e=>setForm({...form,method:e.target.value})}><option>GET</option><option>POST</option><option>HEAD</option></select></label><label>Check interval<select value={form.interval} onChange={e=>setForm({...form,interval:e.target.value})}><option value={30}>30 seconds</option><option value={60}>1 minute</option><option value={300}>5 minutes</option><option value={900}>15 minutes</option></select></label></div>
    <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button type="submit" className="button">{monitor?'Save changes':'Add monitor'}</button></div>
  </motion.form></div>
}

function Dashboard() {
  const [monitors,setMonitors]=useState(demoMonitors)
  const [usingDemo,setUsingDemo]=useState(true)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [active,setActive]=useState('Overview')
  const [menuOpen,setMenuOpen]=useState(false)
  const [modalOpen,setModalOpen]=useState(false)
  const [editing,setEditing]=useState(null)
  const [toast,setToast]=useState('')
  useEffect(()=>{axios.get(`${API_URL}/monitors`).then(({data})=>{setMonitors(data.monitors||[]);setUsingDemo(false)}).catch(()=>setUsingDemo(true)).finally(()=>setLoading(false))},[])
  const notify=message=>{setToast(message);window.setTimeout(()=>setToast(''),3000)}
  const operational=monitors.filter(m=>m.status!=='down').length
  const down=monitors.length-operational
  const average=monitors.length?Math.round(monitors.reduce((sum,m)=>sum+(m.responseTime||0),0)/monitors.length):0
  const saveMonitor=async form=>{
    try{
      if(usingDemo){if(editing)setMonitors(items=>items.map(m=>m._id===editing._id?{...m,...form}:m));else setMonitors(items=>[...items,{_id:crypto.randomUUID(),...form,status:'operational',responseTime:0,uptime:100}])}
      else{const response=editing?await axios.put(`${API_URL}/monitors/${editing._id}`,form):await axios.post(`${API_URL}/monitors`,form);setMonitors(items=>editing?items.map(m=>m._id===editing._id?response.data.monitor:m):[...items,response.data.monitor])}
      setModalOpen(false);setEditing(null);notify(editing?'Monitor updated':'Monitor added')
    }catch(requestError){setError(requestError.response?.data?.message||'Could not save the monitor')}
  }
  const deleteMonitor=async monitor=>{
    if(!window.confirm(`Delete ${monitor.name}?`))return
    try{if(!usingDemo)await axios.delete(`${API_URL}/monitors/${monitor._id}`);setMonitors(items=>items.filter(m=>m._id!==monitor._id));notify('Monitor deleted')}catch(requestError){setError(requestError.response?.data?.message||'Could not delete the monitor')}
  }
  const nav=[['Overview',LayoutDashboard],['Monitors',Activity],['Analytics',Gauge],['Incidents',CircleAlert],['Alerts',Bell],['Settings',Settings]]
  return <div className="app-shell">
    <aside className={menuOpen?'sidebar open':'sidebar'}><Brand/><button className="close-menu" onClick={()=>setMenuOpen(false)}><X size={18}/></button><nav className="side-nav">{nav.map(([label,Icon])=><button key={label} className={active===label?'active':''} onClick={()=>{setActive(label);setMenuOpen(false)}}><Icon size={17}/><span>{label}</span></button>)}</nav><div className="sidebar-user"><div className="avatar">AS</div><div><strong>Alex Smith</strong><span>Personal workspace</span></div><LogOut size={16}/></div></aside>
    <main className="dashboard">
      <header className="dashboard-head"><button className="menu-button" onClick={()=>setMenuOpen(true)}><Menu size={20}/></button><div><p>Workspace</p><h1>{active}</h1></div>{usingDemo&&<span className="demo-label">Demo data</span>}<button className="icon-button"><Bell size={18}/><i/></button></header>
      {error&&<div className="error-banner"><CircleAlert size={16}/>{error}<button onClick={()=>setError('')}><X size={15}/></button></div>}
      {loading?<div className="loading-state"><div className="spinner"/><span>Loading monitors...</span></div>:<>
        {(active==='Overview'||active==='Analytics')&&<><section className="metrics"><Metric label="Total monitored" value={monitors.length} detail="Active endpoints" icon={Activity}/><Metric label="Operational" value={operational} detail="No active issues" icon={CheckCircle2} tone="positive"/><Metric label="Currently down" value={down} detail={down?'Requires attention':'No incidents'} icon={CircleAlert} tone={down?'negative':''}/><Metric label="Avg. response" value={`${average}ms`} detail="Across endpoints" icon={Clock3}/></section>
        <section className="dashboard-grid"><article className="panel chart-panel"><div className="panel-head"><div><span>API performance</span><strong>{average} ms</strong></div><select defaultValue="24 hours"><option>24 hours</option><option>7 days</option><option>30 days</option></select></div><div className="chart-area"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><defs><linearGradient id="mainFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#A78BFA" stopOpacity=".22"/><stop offset="100%" stopColor="#A78BFA" stopOpacity="0"/></linearGradient></defs><CartesianGrid stroke="#29292D" strokeDasharray="3 3" vertical={false}/><XAxis dataKey="time" tick={{fill:'#92929B',fontSize:11}} axisLine={false} tickLine={false}/><YAxis tick={{fill:'#92929B',fontSize:11}} axisLine={false} tickLine={false} width={38}/><Tooltip contentStyle={{background:'#1A1A1D',border:'1px solid #29292D',borderRadius:8}}/><Area type="monotone" dataKey="response" stroke="#A78BFA" strokeWidth={2} fill="url(#mainFill)"/></AreaChart></ResponsiveContainer></div></article><article className="panel status-panel"><div className="panel-head"><span>System status</span><span className="live"><i/>Live</span></div><div className="uptime-ring"><div><strong>{monitors.length?'99.98%':'—'}</strong><span>30-day uptime</span></div></div></article></section></>}
        {(active==='Overview'||active==='Monitors')&&<section className="panel table-panel"><div className="panel-head"><div><span>{active==='Monitors'?'All monitors':'Endpoints'}</span><small>{monitors.length} configured</small></div><button className="button small" onClick={()=>{setEditing(null);setModalOpen(true)}}><Plus size={15}/> Add monitor</button></div>{monitors.length===0?<div className="empty-state"><Activity size={24}/><h3>No monitors yet</h3><p>Add your first endpoint to begin monitoring.</p></div>:<div className="table-wrap"><table><thead><tr><th>Endpoint</th><th>Status</th><th>Method</th><th>Response</th><th>Interval</th><th/></tr></thead><tbody>{monitors.map(m=><tr key={m._id}><td><strong>{m.name}</strong><span>{m.url}</span></td><td><Status status={m.status}/></td><td><span className="method">{m.method||'GET'}</span></td><td>{m.responseTime?`${m.responseTime} ms`:'Pending'}</td><td>{m.interval}s</td><td><div className="row-actions"><button onClick={()=>{setEditing(m);setModalOpen(true)}}><Pencil size={15}/></button><button onClick={()=>deleteMonitor(m)}><Trash2 size={15}/></button></div></td></tr>)}</tbody></table></div>}</section>}
        {active==='Incidents'&&<section className="panel list-panel"><div className="panel-head"><span>Recent incidents</span><span className="live"><i/>2 open</span></div><div className="incident"><CircleAlert size={18}/><div><strong>Elevated error rate</strong><p>Payments · HTTP 503</p></div><span>Started 18 min ago</span></div><div className="incident resolved"><CheckCircle2 size={18}/><div><strong>Authentication timeout</strong><p>Recovered after 4 minutes</p></div><span>Resolved 2h ago</span></div></section>}
        {active==='Alerts'&&<section className="panel settings-panel"><div className="panel-head"><div><span>Email notifications</span><small>Receive endpoint state changes</small></div></div><label>Email address<input defaultValue="alex@example.com" type="email"/></label><label>Notify on<select><option>Downtime and recovery</option><option>Downtime only</option></select></label><button className="button small" onClick={()=>notify('Alert settings saved')}>Save alert settings</button></section>}
        {active==='Settings'&&<section className="panel settings-panel"><div className="panel-head"><div><span>Workspace settings</span><small>Personal workspace</small></div></div><label>Workspace name<input defaultValue="Personal workspace"/></label><label>Timezone<select><option>UTC</option><option>America/New York</option><option>Europe/London</option></select></label><button className="button small" onClick={()=>notify('Settings saved')}>Save changes</button></section>}
      </>}
    </main>
    {modalOpen&&<MonitorModal monitor={editing} onClose={()=>{setModalOpen(false);setEditing(null)}} onSave={saveMonitor}/>}
    {toast&&<motion.div className="toast" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}><CheckCircle2 size={16}/>{toast}</motion.div>}
  </div>
}

function App(){const location=useLocation();return location.pathname==='/'?<Landing/>:<Dashboard/>}

export default App
