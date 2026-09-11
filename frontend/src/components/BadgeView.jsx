import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';

// Simulated registry data for generating badge
const registry = {
  "MCI-2015-78901": {name:"Dr. Anil Mehta", qualification:"MBBS, MD (General Medicine)", council:"National Medical Commission", status:"active", type:"doctor"},
  "KMC-45892": {name:"Dr. Rekha Nair", qualification:"MBBS (Karnataka Medical Council)", council:"Karnataka Medical Council", status:"active", type:"doctor"},
  "DMC-10294": {name:"Dr. Farhan Ali", qualification:"MBBS, DNB (Delhi Medical Council)", council:"Delhi Medical Council", status:"active", type:"doctor"},
  "MCI-2012-44102": {name:"Dr. Suresh Patil", qualification:"MBBS", council:"National Medical Commission", status:"suspended", type:"doctor"},
  "UNREG-99999": null,
  "MPCL-2020-3301": {name:"Shanti Multispeciality Clinic", qualification:"Registered nursing home", council:"MP State Health Dept.", status:"active", type:"facility"},
  "MPCL-2018-0099": {name:"Fair Cure Medical Centre", qualification:"Registered clinic", council:"MP State Health Dept.", status:"suspended", type:"facility"}
};

export default function BadgeView({ initialRegId = '' }) {
  const [inputValue, setInputValue] = useState(initialRegId);
  const [generatedId, setGeneratedId] = useState(null);
  const qrCanvasRef = useRef(null);

  useEffect(() => {
    if (initialRegId) {
      setInputValue(initialRegId);
      handleGenerate(initialRegId);
    }
  }, [initialRegId]);

  const handleGenerate = (idToGenerate = inputValue) => {
    const val = idToGenerate.trim();
    if (!val) {
      setGeneratedId(null);
      return;
    }
    setGeneratedId(val);
  };

  useEffect(() => {
    if (generatedId && qrCanvasRef.current) {
      const rec = registry[generatedId];
      if (rec && rec.status === 'active') {
        const verifyUrl = 'https://health-safe.example/verify/' + encodeURIComponent(generatedId);
        QRCode.toCanvas(qrCanvasRef.current, verifyUrl, {
          width: 86,
          margin: 1,
          color: { dark: '#0E2438', light: '#FFFFFF' }
        }, (err) => {
          if (err) console.error(err);
        });
      }
    }
  }, [generatedId]);

  const handleDownload = () => {
    const card = document.getElementById('badgeCard');
    if (!card) return;
    const qrCanvas = qrCanvasRef.current;
    const w = 480, h = 620;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0,0,0,h);
    grad.addColorStop(0, '#0E2438');
    grad.addColorStop(1, '#16334D');
    ctx.fillStyle = grad;
    
    ctx.beginPath();
    const r = 20;
    ctx.moveTo(r, 0);
    ctx.arcTo(w, 0, w, h, r);
    ctx.arcTo(w, h, 0, h, r);
    ctx.arcTo(0, h, 0, 0, r);
    ctx.arcTo(0, 0, w, 0, r);
    ctx.closePath();
    ctx.fill();

    const rec = registry[generatedId];
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '600 34px Georgia, serif';
    ctx.fillText(rec.name, 36, 150);
    ctx.font = '400 16px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(rec.qualification, 36, 180);
    ctx.fillText(rec.council, 36, 205);
    ctx.font = '400 18px "Courier New", monospace';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(generatedId, 36, 250);

    ctx.fillStyle = '#FFFFFF';
    
    ctx.beginPath();
    const qrR = 8;
    ctx.moveTo(36+qrR, 290);
    ctx.arcTo(36+130, 290, 36+130, 290+130, qrR);
    ctx.arcTo(36+130, 290+130, 36, 290+130, qrR);
    ctx.arcTo(36, 290+130, 36, 290, qrR);
    ctx.arcTo(36, 290, 36+130, 290, qrR);
    ctx.closePath();
    ctx.fill();
    
    if (qrCanvas) ctx.drawImage(qrCanvas, 49, 303, 104, 104);

    ctx.font = '400 13px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    
    const text = "Scan to view this record's live status on Health-Safe";
    const words = text.split(' ');
    let line = '';
    let y = 330;
    for(let i=0;i<words.length;i++){
      const test = line + words[i] + ' ';
      if(ctx.measureText(test).width > 260 && i>0){
        ctx.fillText(line, 184, y);
        line = words[i] + ' ';
        y += 18;
      } else {
        line = test;
      }
    }
    ctx.fillText(line, 184, y);

    ctx.font = '400 12px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText('Issued by Health-Safe — demo credential, not a legal certificate', 36, h - 30);

    const link = document.createElement('a');
    link.download = `health-safe-badge-${generatedId.replace(/'/g,"")}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const renderBadge = () => {
    if (!generatedId) {
      return <div className="badge-empty">Enter a registration number above to generate a badge.</div>;
    }

    const rec = registry[generatedId];
    if (!rec) {
      return <div className="badge-empty">No active registration found for <span className="mono">{generatedId}</span>. Badges can only be issued for verified, active records.</div>;
    }
    if (rec.status !== 'active') {
      return <div className="badge-empty">This registration is currently <strong>{rec.status}</strong>. A badge cannot be issued until the record is active again.</div>;
    }

    const initials = rec.name.replace(/^Dr\.\s*/,'').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();

    return (
      <>
        <div className="badge-card" id="badgeCard">
          <div className="badge-top">
            <div className="badge-seal">{initials}</div>
            <span className="badge-status">Verified active</span>
          </div>
          <div className="badge-name">{rec.name}</div>
          <div className="badge-meta">{rec.qualification}</div>
          <div className="badge-meta">{rec.council}</div>
          <div className="badge-reg">{generatedId}</div>
          <div className="badge-qr-wrap">
            <canvas ref={qrCanvasRef} width="86" height="86"></canvas>
            <div className="badge-qr-text">Scan to view this<br/>record's live status<br/>on Health-Safe</div>
          </div>
          <div className="badge-foot">Issued by Health-Safe · demo credential, not a legal certificate</div>
        </div>
        <button className="btn btn-outline btn-full" style={{ marginTop: '16px' }} onClick={handleDownload}>Download badge as image</button>
      </>
    );
  };

  return (
    <section className="view active animate-fade-in">
      <div className="page-head">
        <div className="eyebrow">For registered providers</div>
        <h1>Get your verified badge</h1>
        <p>If your registration is active, generate a badge with a scannable QR code that patients can check instantly — for your clinic entrance, website, or prescription pad.</p>
      </div>

      <div className="search-panel">
        <div className="search-row">
          <input 
            type="text" 
            placeholder="Enter your registration number (e.g. MCI-2015-78901)"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          />
          <button className="btn btn-primary" onClick={() => handleGenerate()}>Generate badge</button>
        </div>
        <div className="samples">
          <button className="sample-chip chip-active" onClick={() => { setInputValue('MCI-2015-78901'); handleGenerate('MCI-2015-78901'); }}>MCI-2015-78901</button>
          <button className="sample-chip chip-active" onClick={() => { setInputValue('MPCL-2020-3301'); handleGenerate('MPCL-2020-3301'); }}>MPCL-2020-3301</button>
          <button className="sample-chip chip-suspended" onClick={() => { setInputValue('MCI-2012-44102'); handleGenerate('MCI-2012-44102'); }}>MCI-2012-44102</button>
        </div>
      </div>

      <div className="badge-layout">
        <div>
          {renderBadge()}
        </div>
        <div>
          <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>Why display this badge</h3>
          <p style={{ fontSize: '13.5px', color: 'var(--ink-soft)' }}>Patients scan the QR code and land directly on this record's live verification result — no manual lookup required. Badges are only issued for active, currently valid registrations, and are automatically invalid if a registration is later suspended.</p>
        </div>
      </div>
    </section>
  );
}
