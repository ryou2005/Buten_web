import { useRef, useEffect } from 'react'
import gsap from 'gsap'

const skills = [
  { name: 'REACT_CORE', level: 90 },
  { name: 'THREE_JS_ENGINE', level: 75 },
  { name: 'ANIMATION_LIB', level: 85 },
  { name: 'UI_SYSTEMS', level: 80 },
]

const About = () => {
  return (
    <section id="about" style={{ padding: '8rem 0', position: 'relative' }}>
      <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6rem' }}>
        
        <div>
          <h2 style={{ fontSize: 'var(--text-lg)', color: 'white', marginBottom: '2rem' }}>
            <span style={{ color: 'var(--brand-purple)' }}>//</span> SYSTEM_PROFILE
          </h2>
          <div className="cyber-card" style={{ padding: '2rem', border: '1px solid rgba(255,255,255,0.1)' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', color: 'var(--text-main)', lineHeight: 1.8 }}>
              IDENT: THE_ENGINEER<br/>
              CLASS: FRONTEND_ARCHITECT<br/>
              MISSION: CONSTRUCTING IMMERSIVE DIGITAL REALITIES.<br/><br/>
              &gt; Exploring the intersection of code and visual art.<br/>
              &gt; Driven by precision and performance.
            </p>
          </div>
        </div>

        <div>
           <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginBottom: '2rem', letterSpacing: '0.2em' }}>
             :: DIAGNOSTICS ::
           </h3>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
             {skills.map((skill) => (
               <div key={skill.name}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--brand-cyan)' }}>
                   <span>{skill.name}</span>
                   <span>{skill.level}%_OPTIMIZED</span>
                 </div>
                 <div style={{ height: '4px', background: 'rgba(0, 243, 255, 0.1)', width: '100%', position: 'relative' }}>
                   <div style={{ 
                     height: '100%', 
                     background: 'var(--brand-cyan)', 
                     width: `${skill.level}%`, 
                     boxShadow: '0 0 10px var(--brand-cyan)',
                     position: 'relative'
                   }}>
                     <div style={{ position: 'absolute', right: 0, top: '-3px', width: '2px', height: '10px', background: 'white' }}></div>
                   </div>
                 </div>
               </div>
             ))}
           </div>
        </div>

      </div>
    </section>
  )
}

export default About
