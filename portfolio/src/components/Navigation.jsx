import { useRef, useEffect } from 'react'
import gsap from 'gsap'

const Navigation = () => {
  const navRef = useRef(null)

  useEffect(() => {
    gsap.fromTo(navRef.current, 
      { y: -50, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: 'power2.out' }
    )
  }, [])

  return (
    <nav ref={navRef} className="fixed top-0 left-0 w-full z-50 flex justify-between items-center"
         style={{ 
           position: 'fixed', 
           top: 0, 
           left: 0, 
           width: '100%', 
           zIndex: 100, 
           padding: '1.5rem 2rem', 
           display: 'flex', 
           justifyContent: 'space-between', 
           alignItems: 'center',
           background: 'linear-gradient(180deg, rgba(5,5,16,0.9) 0%, rgba(5,5,16,0) 100%)',
           borderBottom: '1px solid rgba(0, 243, 255, 0.1)'
         }}>
      
      <div className="flex items-center gap-4" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: '10px', height: '10px', background: 'var(--brand-cyan)', boxShadow: 'var(--glow-cyan)' }}></div>
        <div className="logo font-display text-xl tracking-widest text-white"
             style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'white', textShadow: '0 0 5px var(--brand-cyan)' }}>
          SYSTEM.ROOT
        </div>
      </div>

      <div className="links hidden md:flex gap-8" style={{ display: 'flex', gap: '2rem' }}>
        {['01 // WORK', '02 // ABOUT', '03 // COMM'].map((item) => (
          <a key={item} href={`#${item.split('//')[1].trim().toLowerCase()}`} 
             className="nav-link"
             style={{ 
               textDecoration: 'none', 
               color: 'var(--text-dim)', 
               fontFamily: 'var(--font-mono)', 
               fontSize: '0.8rem',
               letterSpacing: '0.1em',
               transition: 'color 0.3s'
             }}
             onMouseEnter={(e) => { e.target.style.color = 'var(--brand-cyan)'; e.target.style.textShadow = 'var(--glow-cyan)'; }}
             onMouseLeave={(e) => { e.target.style.color = 'var(--text-dim)'; e.target.style.textShadow = 'none'; }}
          >
            [{item}]
          </a>
        ))}
      </div>
      
      {/* HUD Corner Accents */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '20px', height: '20px', borderBottom: '2px solid var(--brand-cyan)', borderLeft: '2px solid var(--brand-cyan)' }}></div>
      <div style={{ position: 'absolute', bottom: 0, right: 0, width: '20px', height: '20px', borderBottom: '2px solid var(--brand-cyan)', borderRight: '2px solid var(--brand-cyan)' }}></div>

    </nav>
  )
}

export default Navigation
