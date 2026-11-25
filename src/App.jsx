import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  Activity, ArrowUpRight, Bell, BookOpen, Check, ChevronDown, Code2,
  Compass, GitBranch, GitFork, Github, Globe2, LockKeyhole, LogOut,
  Menu, Plus, Search, Settings2, ShieldCheck, Sparkles, Star, Terminal,
  X, Zap
} from 'lucide-react'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

const languages = ['JavaScript','TypeScript','Python','HTML','CSS','Rust','Go','C++','Other']
const colors = { JavaScript:'#f1e05a', TypeScript:'#3178c6', Python:'#3572a5', HTML:'#e34c26', CSS:'#563d7c', Rust:'#dea584', Go:'#00add8', 'C++':'#f34b7d', Other:'#8b949e' }

function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [repos, setRepos] = useState([])
  const [stars, setStars] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('discover')
  const [authOpen, setAuthOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [authMode, setAuthMode] = useState('signin')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [authForm, setAuthForm] = useState({email:'',password:''})
  const [repoForm, setRepoForm] = useState({name:'',description:'',language:'JavaScript',is_public:true,readme:''})

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    supabase.auth.getSession().then(({data}) => setSession(data.session))
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event,next) => setSession(next))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase) return
    let alive = true
    async function load() {
      setLoading(true)
      const {data: userData} = await supabase.auth.getUser()
      const user = userData?.user
      if (user) {
        const username = (user.user_metadata?.username || user.email?.split('@')[0] || 'developer').toLowerCase().replace(/[^a-z0-9-]/g,'').slice(0,24)
        const {data: p} = await supabase.from('nxthub_profiles').upsert({
          id:user.id, username, display_name:user.user_metadata?.display_name || username, bio:'', updated_at:new Date().toISOString()
        }, {onConflict:'id'}).select().maybeSingle()
        if (alive) setProfile(p)
      } else if (alive) setProfile(null)
      const {data: publicRepos} = await supabase.from('nxthub_repositories').select('*').eq('is_public',true).order('created_at',{ascending:false}).limit(60)
      if (alive) setRepos(publicRepos || [])
      if (user) {
        const {data: privateRepos} = await supabase.from('nxthub_repositories').select('*').eq('owner_id',user.id).order('created_at',{ascending:false})
        if (alive) setRepos(prev => {
          const map = new Map([...prev,...(privateRepos || [])].map(r => [r.id,r]))
          return [...map.values()]
        })
        const {data: userStars} = await supabase.from('nxthub_stars').select('repository_id').eq('user_id',user.id)
        if (alive) setStars((userStars || []).map(s => s.repository_id))
      } else if (alive) setStars([])
      if (alive) setLoading(false)
    }
    load()
    return () => { alive = false }
  }, [session])

  const visibleRepos = useMemo(() => {
    let list = repos
    if (tab === 'your') list = session ? list.filter(r => r.owner_id === session.user.id) : []
    if (tab === 'starred') list = list.filter(r => stars.includes(r.id))
    const q = query.trim().toLowerCase()
    if (q) list = list.filter(r => [r.name,r.description,r.language].join(' ').toLowerCase().includes(q))
    return list
  }, [repos,tab,query,session,stars])

  async function authenticate(e) {
    e.preventDefault()
    if (!supabase) return
    setBusy(true); setNotice('')
    const result = authMode === 'signup'
      ? await supabase.auth.signUp({email:authForm.email,password:authForm.password,options:{data:{username:authForm.email.split('@')[0],display_name:authForm.email.split('@')[0]}}})
      : await supabase.auth.signInWithPassword(authForm)
    setBusy(false)
    if (result.error) setNotice(result.error.message)
    else if (authMode === 'signup' && !result.data.session) setNotice('Check your inbox to confirm your email, then sign in.')
    else { setAuthOpen(false); setNotice('Welcome to NXTHUB.') }
  }

  async function signOut() { await supabase?.auth.signOut(); setTab('discover'); setNotice('Signed out.') }

  async function createRepo(e) {
    e.preventDefault()
    if (!session || !supabase) return
    const slug = repoForm.name.trim().toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-|-$/g,'')
    if (!slug) return setNotice('Choose a repository name first.')
    setBusy(true); setNotice('')
    const {data,error} = await supabase.from('nxthub_repositories').insert({
      owner_id:session.user.id,name:repoForm.name.trim(),slug,description:repoForm.description.trim(),
      language:repoForm.language,is_public:repoForm.is_public,readme:repoForm.readme,stars_count:0
    }).select().single()
    setBusy(false)
    if (error) setNotice(error.message)
    else { setRepos(prev => [data,...prev.filter(r => r.id !== data.id)]); setCreateOpen(false); setRepoForm({name:'',description:'',language:'JavaScript',is_public:true,readme:''}); setTab('your'); setNotice('Repository created.') }
  }

  async function toggleStar(repo) {
    if (!session) { setAuthOpen(true); setNotice('Sign in to star repositories.'); return }
    const isStarred = stars.includes(repo.id)
    if (isStarred) {
      const {error} = await supabase.from('nxthub_stars').delete().eq('user_id',session.user.id).eq('repository_id',repo.id)
      if (error) return setNotice(error.message)
      setStars(prev => prev.filter(id => id !== repo.id))
    } else {
      const {error} = await supabase.from('nxthub_stars').insert({user_id:session.user.id,repository_id:repo.id})
      if (error) return setNotice(error.message)
      setStars(prev => [...prev,repo.id])
    }
  }

  const configured = Boolean(supabase)
  const initials = (profile?.display_name || session?.user?.email || 'N').slice(0,1).toUpperCase()

  return <div className="app-shell">
    <div className="ambient ambient-one"/><div className="ambient ambient-two"/>
    <header className="topbar">
      <a className="brand" href="#" onClick={() => setTab('discover')}><span className="brand-mark"><Code2 size={19}/></span><span>nxt<span className="brand-light">hub</span><i>.</i></span></a>
      <div className="top-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search repositories, languages..." /><kbd>⌘ K</kbd></div>
      <div className="top-actions">
        <button className="icon-btn hide-mobile" title="Activity"><Activity size={18}/></button>
        <button className="icon-btn hide-mobile" title="Notifications"><Bell size={18}/></button>
        {session ? <div className="user-menu"><span className="avatar">{initials}</span><span className="user-label">{profile?.username || session.user.email?.split('@')[0]}</span><button className="icon-btn" onClick={signOut} title="Sign out"><LogOut size={17}/></button></div> : <button className="btn btn-outline btn-small" onClick={()=>{setAuthMode('signin');setAuthOpen(true)}}>Sign in</button>}
        <button className="mobile-toggle icon-btn" onClick={()=>setMobileNav(!mobileNav)}><Menu size={20}/></button>
      </div>
    </header>

    <div className="layout">
      <aside className={`sidebar ${mobileNav?'sidebar-open':''}`}>
        <div className="side-label">WORKSPACE</div>
        <button className={`nav-item ${tab==='discover'?'active':''}`} onClick={()=>{setTab('discover');setMobileNav(false)}}><Compass size={17}/> Discover <span className="nav-pip"/></button>
        <button className={`nav-item ${tab==='your'?'active':''}`} onClick={()=>{setTab('your');setMobileNav(false)}}><BookOpen size={17}/> Your repositories</button>
        <button className={`nav-item ${tab==='starred'?'active':''}`} onClick={()=>{setTab('starred');setMobileNav(false)}}><Star size={17}/> Starred</button>
        <div className="side-divider"/>
        <div className="side-label">DEVELOPMENT</div>
        <a className="nav-item" href="https://docs.github.com" target="_blank" rel="noreferrer"><Terminal size={17}/> Developer docs <ArrowUpRight size={13} className="external"/></a>
        <a className="nav-item" href="https://supabase.com/dashboard" target="_blank" rel="noreferrer"><ShieldCheck size={17}/> Backend status <ArrowUpRight size={13} className="external"/></a>
        <div className="sidebar-bottom">
          <div className="upgrade-card"><div className="upgrade-icon"><Sparkles size={17}/></div><strong>Build without limits.</strong><p>Your next great idea starts with a repository.</p><button onClick={()=>session?setCreateOpen(true):(setAuthOpen(true))}>Create a project <ArrowUpRight size={14}/></button></div>
          <div className="side-foot"><span className="status-dot"/> All systems operational <span>v1.0</span></div>
        </div>
      </aside>

      <main className="main-content">
        <section className="hero">
          <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line"/> THE DEVELOPER SPACE <span className="eyebrow-line"/></div>
            <h1>Code boldly.<br/><span>Build what's next.</span></h1>
            <p>A home for your code, ideas, and the people who help bring them to life.</p>
            <div className="hero-actions"><button className="btn btn-primary" onClick={()=>session?setCreateOpen(true):(setAuthOpen(true))}><Plus size={17}/> Create repository</button><button className="btn btn-ghost" onClick={()=>setTab('discover')}>Explore projects <ArrowUpRight size={16}/></button></div>
          </div>
          <div className="hero-art" aria-hidden="true"><div className="orbit orbit-a"/><div className="orbit orbit-b"/><div className="orbit orbit-c"/><div className="core"><Code2 size={43}/></div><div className="float-chip chip-a"><GitBranch size={14}/> main</div><div className="float-chip chip-b"><Zap size={14}/> ship it</div><div className="float-chip chip-c"><span className="mini-dot"/> 99.9% uptime</div></div>
          <div className="hero-bottom"><span><span className="pulse-dot"/> A new space for builders</span><span>DESIGNED FOR WHAT'S NEXT <ArrowUpRight size={13}/></span></div>
        </section>

        {!configured && <div className="config-alert"><Settings2 size={18}/><div><strong>Connect your Supabase project</strong><span>Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in Vercel Environment Variables to activate accounts and repositories.</span></div></div>}
        {notice && <div className="notice"><span>{notice}</span><button onClick={()=>setNotice('')}><X size={15}/></button></div>}

        <section className="repo-section">
          <div className="section-head"><div><div className="eyebrow small-eyebrow">THE COMMUNITY</div><h2>{tab==='your'?'Your repositories':tab==='starred'?'Your starred projects':'Explore repositories'} <span className="count">{visibleRepos.length}</span></h2><p>{tab==='your'?'Everything you are building, in one place.':tab==='starred'?'Projects you want to keep close.':'Discover ideas and projects from the NXTHUB community.'}</p></div><button className="btn btn-outline" onClick={()=>session?setCreateOpen(true):setAuthOpen(true)}><Plus size={16}/> New repository</button></div>
          <div className="filter-row"><div className="filter-tabs"><button className={tab==='discover'?'selected':''} onClick={()=>setTab('discover')}>All projects</button><button className={tab==='your'?'selected':''} onClick={()=>session?setTab('your'):setAuthOpen(true)}>Your projects</button><button className={tab==='starred'?'selected':''} onClick={()=>session?setTab('starred'):setAuthOpen(true)}>Starred</button></div><div className="sort-label"><span className="status-dot"/> Live database</div></div>
          {loading ? <div className="empty-state"><div className="loader"/><p>Loading the community...</p></div> : visibleRepos.length ? <div className="repo-grid">{visibleRepos.map(repo=><article className="repo-card" key={repo.id}><div className="repo-card-top"><div className="repo-icon"><Code2 size={18}/></div><span className={repo.is_public?'visibility public':'visibility private'}>{repo.is_public?<Globe2 size={12}/>:<LockKeyhole size={12}/>} {repo.is_public?'Public':'Private'}</span></div><a className="repo-name" href={`#repo-${repo.slug}`} onClick={e=>{e.preventDefault();setNotice(`Repository: ${repo.name} · File browser is coming in the next build.`)}}>{repo.name}<ArrowUpRight size={14}/></a><p className="repo-desc">{repo.description || 'No description yet. Just a little room for a big idea.'}</p><div className="repo-meta"><span><i style={{background:colors[repo.language]||colors.Other}}/>{repo.language}</span><button className={stars.includes(repo.id)?'star-action starred':'star-action'} onClick={()=>toggleStar(repo)}><Star size={14} fill={stars.includes(repo.id)?'currentColor':'none'}/>{repo.stars_count || 0}</button></div></article>)}</div> : <div className="empty-state"><div className="empty-icon"><GitFork size={22}/></div><strong>{tab==='starred'?'No starred projects yet':tab==='your'?'Your workspace is ready':'The first commit is yours.'}</strong><p>{tab==='starred'?'Star a public repository to find it here.':tab==='your'?'Create your first repository and start building.':'No repositories match this view yet. Create one and kick things off.'}</p><button className="btn btn-primary" onClick={()=>session?setCreateOpen(true):setAuthOpen(true)}><Plus size={16}/> Create repository</button></div>}
        </section>
        <footer className="footer"><a className="brand footer-brand" href="#"><span className="brand-mark"><Code2 size={15}/></span><span>nxt<span className="brand-light">hub</span><i>.</i></span></a><span>Made for the makers, the tinkerers, the next generation.</span><span>© 2026 NXTHUB</span></footer>
      </main>
    </div>

    {authOpen && <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setAuthOpen(false)}><div className="modal"><button className="modal-close" onClick={()=>setAuthOpen(false)}><X size={18}/></button><div className="modal-mark"><Code2 size={22}/></div><div className="eyebrow small-eyebrow">WELCOME TO NXTHUB</div><h2>{authMode==='signup'?'Create your account':'Welcome back.'}</h2><p className="modal-sub">Your next idea is one sign-in away.</p><form onSubmit={authenticate} className="modal-form"><label>Email address<input type="email" required autoComplete="email" value={authForm.email} onChange={e=>setAuthForm({...authForm,email:e.target.value})} placeholder="you@example.com"/></label><label>Password<input type="password" minLength="6" required autoComplete={authMode==='signup'?'new-password':'current-password'} value={authForm.password} onChange={e=>setAuthForm({...authForm,password:e.target.value})} placeholder="At least 6 characters"/></label><button className="btn btn-primary full-btn" disabled={busy||!configured}>{busy?'Please wait...':authMode==='signup'?'Create account':'Sign in'} <ArrowUpRight size={16}/></button></form><div className="modal-switch">{authMode==='signup'?'Already have an account?':'New to NXTHUB?'} <button onClick={()=>{setAuthMode(authMode==='signup'?'signin':'signup');setNotice('')}}>{authMode==='signup'?'Sign in':'Create an account'}</button></div></div></div>}

    {createOpen && <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setCreateOpen(false)}><div className="modal modal-wide"><button className="modal-close" onClick={()=>setCreateOpen(false)}><X size={18}/></button><div className="modal-mark"><GitBranch size={22}/></div><div className="eyebrow small-eyebrow">START SOMETHING</div><h2>Create a repository</h2><p className="modal-sub">A fresh space for your next big idea.</p><form onSubmit={createRepo} className="modal-form"><label>Repository name<input required maxLength="80" value={repoForm.name} onChange={e=>setRepoForm({...repoForm,name:e.target.value})} placeholder="awesome-project"/></label><label>Description <span className="optional">Optional</span><input maxLength="180" value={repoForm.description} onChange={e=>setRepoForm({...repoForm,description:e.target.value})} placeholder="What are you building?"/></label><div className="form-row"><label>Primary language<select value={repoForm.language} onChange={e=>setRepoForm({...repoForm,language:e.target.value})}>{languages.map(l=><option key={l}>{l}</option>)}</select></label><label>Visibility<select value={repoForm.is_public?'public':'private'} onChange={e=>setRepoForm({...repoForm,is_public:e.target.value==='public'})}><option value="public">Public</option><option value="private">Private</option></select></label></div><label>README <span className="optional">Optional</span><textarea rows="3" value={repoForm.readme} onChange={e=>setRepoForm({...repoForm,readme:e.target.value})} placeholder="# Project title&#10;Describe your project..."/></label><button className="btn btn-primary full-btn" disabled={busy}>{busy?'Creating...':'Create repository'} <Plus size={16}/></button></form></div></div>}
  </div>
}

export default App
