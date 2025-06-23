"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from 'framer-motion';
import styles from "../styles/Landing.module.scss"
import heroFormImg from "../assets/hero-form.webp"
import logoImg from "../assets/logo.webp"
import fileIcon from "../assets/file.svg"
import tIcon from "../assets/t.svg"
import tBlueIcon from "../assets/tBlue.svg"
import chromeIcon from "../assets/chrome.svg"
import rocketIcon from "../assets/rocket.svg"
import settingsIcon from "../assets/settings.svg"
import checkIcon from "../assets/check.svg"
import avatar1 from "../assets/avatar1.png"
import avatar2 from "../assets/avatar2.png"
import avatar3 from "../assets/avatar3.png"
import avatar4 from "../assets/avatar4.png"
import form from "../assets/form.webp"
import driveIntegration from "../assets/driveIntegration.webp"
import settingsLanding from "../assets/settingslanding.webp"
import teamSettingsLanding from "../assets/teamseatslanding.webp"


const Landing = () => {
    const avatars = [avatar1, avatar2, avatar3, avatar4]
    const [menuOpen, setMenuOpen] = useState(false)
    const [isScrolled, setIsScrolled] = useState(false)
    const mobileMenuRef = useRef(null)
    const menuBtnRef = useRef(null)

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 0)
        }

        window.addEventListener("scroll", handleScroll)
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    useEffect(() => {
        // Handle clicks outside the mobile menu
        const handleClickOutside = (event) => {
            if (
                menuOpen &&
                mobileMenuRef.current &&
                !mobileMenuRef.current.contains(event.target) &&
                menuBtnRef.current &&
                !menuBtnRef.current.contains(event.target)
            ) {
                setMenuOpen(false)
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [menuOpen])


    const scrollToSection = (e, sectionId) => {
        e.preventDefault()
        const section = document.getElementById(sectionId)
        if (section) {
            // Get the navbar height to offset the scroll position - account for top margin
            const navbarHeight = 105 // 75px navbar + 30px top margin
            const sectionPosition = section.getBoundingClientRect().top
            const offsetPosition = sectionPosition + window.pageYOffset - navbarHeight

            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth",
            })

            // Close mobile menu if open
            if (menuOpen) setMenuOpen(false)
        }
    }

    return (
        <div className={styles.landing}>
            <header className={styles.header}>
                <div className={styles.brand}>
                    <img src={logoImg || "/placeholder.svg"} alt="Blip logo" className={styles.logo} />
                    <span className={styles.brandText}>Blip</span>
                </div>

                <nav className={`${styles.navLinks} ${isScrolled ? styles.scrolled : ""}`}>
                    <a href="#about" onClick={(e) => scrollToSection(e, "about")}>
                        about
                    </a>
                    <a href="#pricing" onClick={(e) => scrollToSection(e, "pricing")}>
                        pricing
                    </a>
                    <a href="#contact" onClick={(e) => scrollToSection(e, "footer")}>
                        Contact Us
                    </a>
                    <button className={styles.startBtn}>Coming Soon</button>
                </nav>

                <button ref={menuBtnRef} className={styles.menuBtn} onClick={() => setMenuOpen((open) => !open)}>
                    Menu
                </button>

                <div ref={mobileMenuRef} className={`${styles.mobileMenu} ${menuOpen ? styles.open : ""}`}>
                    <a href="#about" onClick={(e) => scrollToSection(e, "about")}>
                        about
                    </a>
                    <a href="#pricing" onClick={(e) => scrollToSection(e, "pricing")}>
                        pricing
                    </a>
                    <a href="#features" onClick={(e) => scrollToSection(e, "features")}>
                        features
                    </a>
                    <button className={styles.startBtn} onClick={() => setMenuOpen(false)}>
                        Start Now
                    </button>
                </div>
            </header>

            <motion.section
                className={styles.hero}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
            >

                <h1>
                    The simplest, quickest
                    <br />
                    bulk ad uploader for Meta.
                </h1>

                <div className={styles.featuresList}>
                    <div className={styles.featureItem}>
                        <img src={checkIcon || "/placeholder.svg"} alt="" />
                        <span>Launch 100s of ads in seconds</span>
                    </div>
                    <div className={styles.featureItem}>
                        <img src={checkIcon || "/placeholder.svg"} alt="" />
                        <span>Unlimited Ad Accounts</span>
                    </div>
                    <div className={styles.featureItem}>
                        <img src={checkIcon || "/placeholder.svg"} alt="" />
                        <span>Auto-imports all settings for instant use</span>
                    </div>
                </div>
                <div className={styles.cta}>
                    <button>Coming Soon</button>
                </div>

                <p className={styles.subText}>No CC required. 14 day free trial.</p>

                <div className={styles.heroForm}>
                    <img src={heroFormImg || "/placeholder.svg"} alt="Hero form UI" className={styles.heroBg} />
                    <img src={form || "/placeholder.svg"} alt="Inner overlay" className={styles.heroInner} />
                </div>
            </motion.section>


            <motion.section
                id="about"
                className={styles.featuresIntro}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
            >
                <span>Escape button clicking hell</span>
                <h2>The fastest way to manage multiple ad accounts</h2>
                <p>
                    End context-switching whiplash. No more selecting the same settings over and over, copy-pasting text dozens of
                    times, or sluggish UI.
                </p>
            </motion.section>

            <motion.section
                id="features"
                className={styles.featureBlocks}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
            >

                <div className={`${styles.block} ${styles.yellow}`}>
                    <div className={styles.icon}>
                        <img src={fileIcon || "/placeholder.svg"} alt="Upload icon" />
                    </div>
                    <h3>Upload multiple creatives at once</h3>
                    <p>
                        Automate your ad creation flow with lightning-fast bulk uploads, saved settings, and ad previews — all in
                        one clean dashboard.
                    </p>
                </div>
                <div className={`${styles.block} ${styles.blue}`}>
                    <div className={styles.icon}>
                        <img src={tIcon || "/placeholder.svg"} alt="Templates icon" />
                    </div>
                    <h3>Apply saved templates for copy, CTA, and links</h3>
                    <p>
                        Stop wasting time in Meta Ads Manager's clunky interface. Simply select your ideal settings once. We take
                        care of the rest.
                    </p>
                </div>
            </motion.section>

            {/* Persistent Settings Section */}

            <motion.section
                id="settings"
                className={styles.persistentSettings}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
            >

                <div className={styles.persistentContent}>
                    <div className={styles.persistentIcon}>
                        <img src={settingsIcon || "/placeholder.svg"} alt="Settings icon" />
                    </div>
                    <h3>Persistent Settings<br></br> Per Account</h3>
                    <p>UTMs, page selections, ad name formulas,<br></br>all saved, per ad account, so nothing resets<br></br> on reload.</p>
                </div>
                <img src={settingsLanding} alt="Persistent Settings Screenshot" className={styles.settingsLanding} />

            </motion.section>


            <motion.section
                id="about"
                className={styles.publishRow}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
            >

                <div className={styles.publishCard}>
                    <div className={styles.icon}>
                        <img src={chromeIcon || "/placeholder.svg"} alt="Chrome icon" />
                    </div>
                    <h3>Import files straight from your Google Drive</h3>
                    <p>
                        No need to spend hours downloading hundreds of ad assets. With Blip, you can one-click deploy media from
                        your Drive to Meta Ads Manager.
                    </p>
                </div>
                <img src={driveIntegration} alt="Google Drive Integration Screenshot" className={styles.driveIntegration} />

            </motion.section>

            {/* Pricing Section */}
            <motion.section
                id="pricing"
                className={styles.pricingSection}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
            >

                <div className={styles.pricingContent}>
                    <div className={styles.pricingBadge}>1 Flat Price. Unlimited Ad Accounts</div>
                    <h2>Pricing</h2>
                    <p>UTMs, page selections, ad name formulas <br></br>all saved, per ad account, so nothing resets on reload.</p>
                    <button className={styles.pricingBtn}>Coming Soon</button>
                </div>
                <div className={styles.pricingRight}>
                    <div className={styles.pricingPrice}>$500/month</div>
                    <div className={styles.pricingFeatures}>
                        <div className={styles.pricingFeature}>
                            <img src={checkIcon || "/placeholder.svg"} alt="Check" />
                            <span>Launch 100s of ads together</span>
                        </div>
                        <div className={styles.pricingFeature}>
                            <img src={checkIcon || "/placeholder.svg"} alt="Check" />
                            <span>Unlimited Ad Accounts</span>
                        </div>
                        <div className={styles.pricingFeature}>
                            <img src={checkIcon || "/placeholder.svg"} alt="Check" />
                            <span>Persistent Settings</span>
                        </div>
                    </div>
                </div>
                {/* <div className={styles.pricingPlaceholder} /> */}
            </motion.section>

            {/* Team Seats Section */}
            <motion.section
                id="about"
                className={styles.teamSeats}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
            >

                <div className={styles.teamContent}>
                    <div className={styles.teamIcon}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M12 14C8.13401 14 5 17.134 5 21H19C19 17.134 15.866 14 12 14Z"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                    <h3>Team seats<br></br> Coming Soon</h3>
                    <p>
                        Stop wasting time in Meta Ads Manager's <br></br>clunky interface. Automate your ad creation flow<br></br> with lightning-fast
                        bulk uploads, saved settings,<br></br> and ad previews — all in one clean dashboard.
                    </p>
                </div>
                <img src={teamSettingsLanding} alt="Team Seats Screenshot" className={styles.teamSettingsLanding} />
            </motion.section>

            {/* <motion.section
                id="about"
                className={styles.smallCardsRow}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
            >

                <div className={`${styles.smallCard} ${styles.pink}`}>
                    <div className={`${styles.cardHeader} ${styles.redBackground}`}>
                        <img src={rocketIcon || "/placeholder.svg"} alt="" className={styles.cardIcon} />
                        <h4>Bulk Uploads Done Right</h4>
                    </div>
                    <p>Drag, drop, and upload dozens of videos and images in seconds. No limits. No slowdowns.</p>
                    <div className={styles.placeholder} />
                </div>

                <div className={`${styles.smallCard} ${styles.lightBlue}`}>
                    <div className={`${styles.cardHeader} ${styles.lightBackground}`}>
                        <img src={tBlueIcon || "/placeholder.svg"} alt="" className={styles.cardIcon} />
                        <h4>Smart Defaults &amp; Copy Templates</h4>
                    </div>
                    <p>Save your most-used headlines, primary texts, CTAs, and URLs. Apply them instantly to any ad.</p>
                    <div className={styles.placeholder} />
                </div>

                <div className={`${styles.smallCard} ${styles.green}`}>
                    <div className={`${styles.cardHeader} ${styles.greenBackground}`}>
                        <img src={settingsIcon || "/placeholder.svg"} alt="" className={styles.cardIcon} />
                        <h4>Persistent Settings Per Account</h4>
                    </div>
                    <p>
                        UTM parameters, page selections, ad name formulas — all saved, per ad account, so nothing resets on reload.
                    </p>
                    <div className={styles.placeholder} />
                </div>
            </motion.section> */}

            {/* Footer */}
            <footer id="footer" className={styles.footer}>
                <div className={styles.footerContent}>
                    <div className={styles.footerLeft}>
                        <div className={styles.footerBrand}>
                            <img src={logoImg || "/placeholder.svg"} alt="Blip logo" className={styles.footerLogo} />
                            <span className={styles.footerBrandText}>Blip</span>
                        </div>
                        <div className={styles.footerEmail}><a href="mailto:hello@storeos.co"> hello@storeos.co</a></div>
                    </div>
                    <div className={styles.footerRight}>
                        <a href="/privacy-policy" target="_blank" className={styles.footerLink}>
                            Privacy Policy
                        </a>
                        <a href="/terms-of-service" target="_blank" className={styles.footerLink}>
                            Terms of Service
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    )
}

export default Landing
