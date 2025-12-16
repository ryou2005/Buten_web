import { useEffect } from 'react'
import gsap from 'gsap'

const projects = [
  { id: 1, title: 'NEBULA_OS', category: 'WEBGL_CORE', status: 'DEPLOYED' }, 
  { id: 2, title: 'CHRONOS_V2', category: 'E_COMM_SYS', status: 'ACTIVE' }, 
  { id: 3, title: 'AETHER_NET', category: 'NEURAL_ART', status: 'BETA' }, 
]

const Work = () => {
  return (
    <section id="work" className="py-32" style={{ padding: '10rem 0' }}>
      <div className="container">
        <h2 style={{ fontSize: 'var(--text-lg)', color: 'white', marginBottom: '4rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: 'var(--brand-cyan)' }}>//</span> SELECTED_DATA
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {projects.map((project, index) => (
            <div key={project.id} className="cyber-card group" style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '1fr 3fr 1fr', alignItems: 'center', gap: '2rem' }}>
               
               {/* ID Box */}
               <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', color: 'var(--brand-cyan)', opacity: 0.5 }}>
                 0{index + 1}
               </div>

               {/* Info */}
               <div>
                  <h3 style={{ fontSize: '2.5rem', fontFamily: 'var(--font-display)', color: 'white', marginBottom: '0.5rem' }}>{project.title}</h3>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                    <span style={{ border: '1px solid currentColor', padding: '2px 8px' }}>{project.category}</span>
                    <span style={{ border: '1px solid currentColor', padding: '2px 8px' }}>:: {project.status}</span>
                  </div>
               </div>

               {/* Action */}
               <div style={{ textAlign: 'right' }}>
                  <button style={{ 
                    background: 'transparent', 
                    border: '1px solid var(--brand-cyan)', 
                    color: 'var(--brand-cyan)', 
                    padding: '10px 30px', 
                    fontFamily: 'var(--font-mono)',
                    cursor: 'pointer',
                    letterSpacing: '2px'
                  }}
                  className="hover:bg-[var(--brand-cyan)] hover:text-black transition-colors duration-300"
                  onMouseEnter={(e) => { e.target.style.background = 'var(--brand-cyan)'; e.target.style.color = '#000'; }}
                  onMouseLeave={(e) => { e.target.style.background = 'transparent'; e.target.style.color = 'var(--brand-cyan)'; }}
                  >
                    ACCESS &gt;
                  </button>
               </div>

            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Work
