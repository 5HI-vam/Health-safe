import React from 'react';

export default function Home({ onChangeTab }) {
  return (
    <section className="view active animate-fade-in">
      <div className="hero">
        <div>
          <h1>Verify before you trust. Report when you can't.</h1>
          <p className="lead">Check any doctor's or clinic's registration in seconds, or file a report against a suspected unauthorised practitioner — routed straight to the right authority.</p>
          <div className="hero-actions">
            <button className="btn btn-primary" onClick={() => onChangeTab('verify')}>Verify a doctor or clinic</button>
            <button className="btn btn-outline" onClick={() => onChangeTab('report')}>Report a concern</button>
          </div>
          <div className="stat-strip">
            <div><h2>18,402</h2><p>Registered practitioners indexed</p></div>
            <div><h2>612</h2><p>Reports investigated this year</p></div>
            <div><h2>96%</h2><p>Reports acknowledged within 48h</p></div>
          </div>
        </div>
        <div className="hero-card">
          <p className="cap">Try a sample lookup</p>
          <div className="demo-row"><span className="id mono">MCI-2015-78901</span><span className="badge badge-active">Active</span></div>
          <div className="demo-row"><span className="id mono">MCI-2012-44102</span><span className="badge badge-suspended">Suspended</span></div>
          <div className="demo-row"><span className="id mono">UNREG-99999</span><span className="badge badge-unreg">Not found</span></div>
          <button className="btn btn-outline btn-full" style={{ marginTop: '18px' }} onClick={() => onChangeTab('verify')}>Open verification tool</button>
        </div>
      </div>

      <div className="path-grid">
        <div className="path-card" onClick={() => onChangeTab('verify')}>
          <h3>Verify a doctor</h3>
          <p>Check registration status against National Medical Commission and State Medical Council records.</p>
        </div>
        <div className="path-card" onClick={() => onChangeTab('verify')}>
          <h3>Verify a clinic</h3>
          <p>Confirm a hospital or clinic is a recognised, registered healthcare establishment.</p>
        </div>
        <div className="path-card" onClick={() => onChangeTab('report')}>
          <h3>Report a concern</h3>
          <p>File a report on a suspected unregistered practitioner or unauthorised clinic, with evidence attached.</p>
        </div>
      </div>
    </section>
  );
}
