import React, {useState} from 'react';
import styles from '../styles/Landing.module.scss';
import heroFormImg from '../assets/hero-form.png';
import logoImg from '../assets/logo.png';
import fileIcon from '../assets/file.svg';
import tIcon from '../assets/t.svg';
import tBlueIcon from '../assets/tBlue.svg';
import chromeIcon from '../assets/chrome.svg';
import rocketIcon from '../assets/rocket.svg';
import settingsIcon from '../assets/settings.svg';
import checkIcon from '../assets/check.svg';
import avatar1 from '../assets/avatar1.png';
import avatar2 from '../assets/avatar2.png';
import avatar3 from '../assets/avatar3.png';
import avatar4 from '../assets/avatar4.png';
import form from '../assets/form.png';

const Landing = () => {
    const avatars = [avatar1, avatar2, avatar3, avatar4]
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <div className={styles.landing}>
            <header className={styles.navbar}>
                <div className={styles.brand}>
                    <img src={logoImg} alt="Blip logo" className={styles.logo}/>
                    <span className={styles.brandText}>Blip</span>
                </div>
                <nav className={styles.navLinks}>
                    <a href="#about">about</a>
                    <a href="#pricing">pricing</a>
                    <a href="#features">features</a>
                    <button className={styles.startBtn}>Start Now</button>
                </nav>
                <button
                    className={styles.menuBtn}
                    onClick={() => setMenuOpen(open => !open)}
                >
                    Menu
                </button>
                {menuOpen && (
                    <div className={styles.mobileMenu}>
                        <a href="#about" onClick={() => setMenuOpen(false)}>about</a>
                        <a href="#pricing" onClick={() => setMenuOpen(false)}>pricing</a>
                        <a href="#features" onClick={() => setMenuOpen(false)}>features</a>
                        <button
                            className={styles.startBtn}
                            onClick={() => setMenuOpen(false)}
                        >
                            Start Now
                        </button>
                    </div>
                )}
            </header>
            <section className={styles.hero}>
                <h1>
                    Save 10 hours of work a week by <br/>
                    Batch uploading 100s of ads in a click
                </h1>

                <div className={styles.featuresList}>
                    <div className={styles.featureItem}>
                        <img src={checkIcon} alt=""/>
                        <span>Launch 100s of ads together</span>
                    </div>
                    <div className={styles.featureItem}>
                        <img src={checkIcon} alt=""/>
                        <span>Unlimited Ad Accounts</span>
                    </div>
                    <div className={styles.featureItem}>
                        <img src={checkIcon} alt=""/>
                        <span>Save your settings and launch an ad in seconds</span>
                    </div>
                </div>
                <div className={styles.cta}>
                    <button>Start Posting Ads</button>
                    <button className={styles.demo}>Get A Demo</button>
                </div>

                <p className={styles.subText}>
                    No CC required. 14 day free trial.
                </p>

                <div className={styles.avatars}>
                    {avatars.map((src, i) => (
                        <img key={i} src={src} alt={`Avatar ${i + 1}`} className={styles.avatar}/>
                    ))}
                    <p>
                        100+ marketers are using bau everyday to improve their workflow
                    </p>
                </div>

                <div className={styles.heroForm}>
                    <img src={heroFormImg} alt="Hero form UI" className={styles.heroBg}/>
                    <img src={form} alt="Inner overlay" className={styles.heroInner}/>
                </div>
            </section>
            <section className={styles.featuresIntro}>
                <span>No more context switching</span>
                <h2>The fastest way to manage multiple ad accounts</h2>
                <p>
                    No bulk creative upload flow. Copy-pasting text over and over. Settings that don’t persist between
                    sessions. Time wasted navigating a sluggish UI.
                </p>
            </section>
            <section className={styles.featureBlocks}>
                <div className={`${styles.block} ${styles.yellow}`}>
                    <div className={styles.icon}>
                        <img src={fileIcon} alt="Upload icon"/>
                    </div>
                    <h3>Upload multiple creatives at once</h3>
                    <p>
                        Stop wasting time in Meta Ads Manager’s clunky interface.
                        Automate your ad creation flow with lightning-fast bulk uploads,
                        saved settings, and ad previews — all in one clean dashboard.
                    </p>
                </div>
                <div className={`${styles.block} ${styles.blue}`}>
                    <div className={styles.icon}>
                        <img src={tIcon} alt="Templates icon"/>
                    </div>
                    <h3>Apply saved templates for copy, CTA, and links</h3>
                    <p>
                        Stop wasting time in Meta Ads Manager’s clunky interface.
                        Automate your ad creation flow with lightning-fast bulk uploads,
                        saved settings, and ad previews — all in one clean dashboard.
                    </p>
                </div>
            </section>
            <section className={styles.publishRow}>
                <div className={styles.publishCard}>
                    <div className={styles.icon}>
                        <img src={chromeIcon} alt="Chrome icon"/>
                    </div>
                    <h3>Publish Straight from your Google Drive</h3>
                    <p>
                        Stop wasting time in Meta Ads Manager’s clunky interface.
                        Automate your ad creation flow with lightning-fast bulk uploads,
                        saved settings, and ad previews — all in one clean dashboard.
                    </p>
                    <button className={styles.viewExt}>View Extension</button>
                </div>

                <div className={styles.placeholderCard}/>
            </section>
            <section className={styles.smallCardsRow}>
                <div className={`${styles.smallCard} ${styles.pink}`}>
                    <div className={`${styles.cardHeader} ${styles.redBackground}`}>
                        <img src={rocketIcon} alt="" className={styles.cardIcon}/>
                        <h4>Bulk Uploads Done Right</h4>
                    </div>
                    <p>
                        Drag, drop, and upload dozens of videos and images in seconds.
                        No limits. No slowdowns.
                    </p>
                    <div className={styles.placeholder}/>
                </div>

                <div className={`${styles.smallCard} ${styles.lightBlue}`}>
                    <div className={`${styles.cardHeader} ${styles.lightBackground}`}>
                        <img src={tBlueIcon} alt="" className={styles.cardIcon}/>
                        <h4>Smart Defaults &amp; Copy Templates</h4>
                    </div>
                    <p>
                        Save your most-used headlines, primary texts, CTAs, and URLs.
                        Apply them instantly to any ad.
                    </p>
                    <div className={styles.placeholder}/>
                </div>

                <div className={`${styles.smallCard} ${styles.green}`}>
                    <div className={`${styles.cardHeader} ${styles.greenBackground}`}>
                        <img src={settingsIcon} alt="" className={styles.cardIcon}/>
                        <h4>Persistent Settings Per Account</h4>
                    </div>
                    <p>
                        UTM parameters, page selections, ad name formulas — all saved,
                        per ad account, so nothing resets on reload.
                    </p>
                    <div className={styles.placeholder}/>
                </div>
            </section>

        </div>
    )
};

export default Landing;
