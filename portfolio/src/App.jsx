import { useEffect, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import Navigation from './components/Navigation'
import Hero from './components/Hero'

import Work from './components/Work'
import About from './components/About'

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger)

const Home = () => (
  <main>
    <Navigation />
    <Hero />
    <Work />
    <About />
    <footer style={{ padding: '5rem 0', textAlign: 'center', opacity: 0.5, fontSize: '0.8rem' }}>
      &copy; 2025 THE ENGINEER.
    </footer>
  </main>
)

function App() {
  const lenisRef = useRef()

  useEffect(() => {
    // Initialize Lenis
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smooth: true,
    })
    
    lenisRef.current = lenis

    function raf(time) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }

    requestAnimationFrame(raf)

    // Integrate with GSAP ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update)
    
    gsap.ticker.add((time) => {
      lenis.raf(time * 1000)
    })
    
    gsap.ticker.lagSmoothing(0)

    return () => {
      lenis.destroy()
      gsap.ticker.remove(lenis.raf)
    }
  }, [])

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
