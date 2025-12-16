import { useEffect, useRef } from 'react'
import gsap from 'gsap'

const Hero = () => {
  return (
    <section className="relative h-screen w-full flex flex-col justify-center items-center overflow-hidden" 
      style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      
      {/* Scanline Overlay */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.2))', backgroundSize: '100% 4px', pointerEvents: 'none', zIndex: 10 }}></div>

      <div className="text-center z-10">
        <div style={{ marginBottom: '1rem', color: 'var(--brand-cyan)', fontSize: '0.8rem', letterSpacing: '0.5em', fontFamily: 'var(--font-mono)' }}>
          /// SYSTEM INITIALIZED
        </div>
        
        <h1 className="glitch-text" data-text="DIGITAL ARCHITECT" style={{ fontSize: 'var(--text-xl)', color: 'white', marginBottom: '1rem' }}>
          DIGITAL ARCHITECT
        </h1>
        
        <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', maxWidth: '500px', margin: '0 auto', border: '1px solid rgba(255,255,255,0.1)', padding: '1rem', background: 'rgba(0,0,0,0.5)' }}>
          &gt; EXECUTING CREATIVE PROTOCOLS...<br/>
          &gt; OPTIMIZING USER EXPERIENCE...<br/>
          &gt; STATUS: <span style={{ color: '#0f0' }}>ONLINE</span>
        </p>
      </div>

      <div style={{ position: 'absolute', bottom: '10%', animation: 'pulse 2s infinite' }}>
        <span style={{ color: 'var(--brand-cyan)', fontSize: '2rem' }}>↓</span>
      </div>

      <style>{`
        @keyframes pulse {
          0% { opacity: 0.5; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(10px); }
          100% { opacity: 0.5; transform: translateY(0); }
        }
      `}</style>
    </section>
  )
}

export default Hero
