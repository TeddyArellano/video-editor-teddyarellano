import numpy as np
from scipy.signal import butter, sosfilt
from scipy.io import wavfile
SR=44100
rng=np.random.default_rng(7)
def T(d): return np.arange(int(d*SR))/SR
def bp(x,lo,hi,o=2): return sosfilt(butter(o,[lo,hi],'bandpass',fs=SR,output='sos'),x)
def lp(x,f,o=2): return sosfilt(butter(o,f,'lowpass',fs=SR,output='sos'),x)
def hp(x,f,o=2): return sosfilt(butter(o,f,'highpass',fs=SR,output='sos'),x)
def save(name,x,peak=0.89):
    x=np.asarray(x); x=x/ (np.abs(x).max()+1e-9)*peak
    if x.ndim==1: x=np.stack([x,x],1)
    wavfile.write(f'edit/public/sfx/{name}.wav',SR,(x*32767).astype(np.int16))
def sweep_noise(d,f0,f1,bw=0.6,chunks=40):
    n=int(d*SR); noise=rng.standard_normal(n+SR); out=np.zeros(n)
    edges=np.linspace(0,n,chunks+1).astype(int)
    for i in range(chunks):
        f=f0*(f1/f0)**(i/chunks); lo=max(30,f*(1-bw/2)); hi=min(SR/2-100,f*(1+bw/2))
        y=bp(noise[:edges[i+1]+2000],lo,hi)[edges[i]:edges[i+1]]
        out[edges[i]:edges[i+1]]=y
    return out
# whoosh
d=0.45; t=T(d); env=np.sin(np.pi*(t/d))**2*np.exp(-t*1.5)
w=sweep_noise(d,300,3500)*env; save('whoosh',w,0.8)
# whoosh down (reverse-ish)
save('whoosh2',sweep_noise(0.35,2500,250)*np.sin(np.pi*T(0.35)/0.35)**1.5,0.75)
# impact
d=1.4; t=T(d); f=30+60*np.exp(-t*9); ph=2*np.pi*np.cumsum(f)/SR
boom=np.sin(ph)*np.exp(-t*3.2)
crack=lp(rng.standard_normal(len(t)),5000)*np.exp(-t*40)
tail=lp(rng.standard_normal(len(t)),900)*np.exp(-t*4)*0.25
save('impact',boom+crack*0.5+tail,0.95)
# pop
d=0.12; t=T(d); f=500+900*(t/d); ph=2*np.pi*np.cumsum(f)/SR
save('pop',np.sin(ph)*np.exp(-t*35)+0.2*hp(rng.standard_normal(len(t)),3000)*np.exp(-t*120),0.7)
# click
d=0.05; t=T(d); save('click',hp(rng.standard_normal(len(t)),2000)*np.exp(-t*250)+np.sin(2*np.pi*1800*t)*np.exp(-t*150),0.6)
# riser
d=1.6; t=T(d); r=sweep_noise(d,400,9000,bw=0.8)*(t/d)**2.2
tone=np.sin(2*np.pi*np.cumsum(200*(8**(t/d)))/SR)*(t/d)**3*0.25
save('riser',r+tone,0.7)
# glitch
d=0.3; t=T(d); g=np.sign(np.sin(2*np.pi*np.cumsum(np.repeat(rng.uniform(80,900,15),int(len(t)/15)+1)[:len(t)])/SR))
g=g*np.repeat(rng.integers(0,2,30),int(len(t)/30)+1)[:len(t)]*np.exp(-t*6)
save('glitch',lp(g+0.5*rng.standard_normal(len(t)),6000),0.5)

# ---------------- MUSIC ----------------
BPM=120; beat=60/BPM; DUR=34.0; n=int(DUR*SR); t=np.arange(n)/SR
L=np.zeros(n); Rr=np.zeros(n)
def add(buf,x,at):
    i=int(at*SR); j=min(n,i+len(x));
    if i<n: buf[i:j]+=x[:j-i]
def kick():
    tt=T(0.4); f=45+110*np.exp(-tt*35); return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-tt*9)+0.3*hp(rng.standard_normal(len(tt)),2000)*np.exp(-tt*200)
def clap():
    tt=T(0.25); x=bp(rng.standard_normal(len(tt)),900,3500)
    e=np.exp(-tt*25)+0.6*np.exp(-np.maximum(tt-0.012,0)*30)*(tt>0.012); return x*e
def hat(o=False):
    tt=T(0.15 if o else 0.04); return hp(rng.standard_normal(len(tt)),7000)*np.exp(-tt*(18 if o else 90))
K=kick(); C=clap()
nbeats=int(DUR/beat)
END=860/30  # end card hit
DROP=16.5
for b in range(nbeats):
    tb=b*beat
    if tb>=END+0.01: break
    add(L,K*0.9,tb); add(Rr,K*0.9,tb)
    if b%2==1:
        c=C*(0.5 if tb<DROP else 0.6); add(L,c,tb); add(Rr,c*0.9,tb+0.004)
    for h in range(2):
        th=tb+h*beat/2; hh=hat(h==1)*(0.18 if h else 0.1)
        add(L,hh*0.8,th); add(Rr,hh,th)
    if tb>=DROP:
        for h in (1,3):
            th=tb+h*beat/4; hh=hat()*0.08; add(L,hh,th); add(Rr,hh*0.7,th)
# sidechain envelope
sc=np.ones(n)
for b in range(nbeats):
    i=int(b*beat*SR); m=int(0.3*SR); j=min(n,i+m)
    sc[i:j]=np.minimum(sc[i:j],0.25+0.75*(np.arange(j-i)/m)**0.6)
# progression Am F C G, 1 bar each (2s)
roots=[55.0,43.65,65.41,49.0]
chords=[[220,261.63,329.63],[174.61,220,261.63],[261.63,329.63,392.0],[196.0,246.94,293.66]]
sub=np.zeros(n); pad=np.zeros(n); arp=np.zeros(n)
bar=4*beat
for k in range(int(DUR/bar)+1):
    i0=int(k*bar*SR); i1=min(n,int((k+1)*bar*SR));
    if i0>=n: break
    tt=np.arange(i1-i0)/SR; idx=k%4
    sub[i0:i1]=np.sin(2*np.pi*roots[idx]*tt)+0.3*np.sin(4*np.pi*roots[idx]*tt)
    for f in chords[idx]:
        for dt in (-0.12,0.0,0.13):
            ph=(tt*f*(1+dt/100))%1.0; pad[i0:i1]+=(2*ph-1)*0.1
    # arp 16ths
    notes=[chords[idx][j%3]*(2 if j%4==3 else 1) for j in range(16)]
    for j,f in enumerate(notes):
        a0=i0+int(j*beat/4*SR); a1=min(n,a0+int(beat/4*SR))
        if a0>=n: break
        ta=np.arange(a1-a0)/SR; arp[a0:a1]+=np.sign(np.sin(2*np.pi*f*2*ta))*np.exp(-ta*18)*0.5
pad=lp(pad,1400); arp=lp(arp,3000)
cut=(t<END).astype(float)
# fades: sub + pad after end hit decay
tail=np.where(t<END,1.0,np.exp(-(t-END)*1.2))
sub_mix=sub*sc*0.45*cut
pad_mix=pad*(0.5+0.5*sc)*0.55*tail
arp_mix=arp*sc*0.22*((t>=DROP)&(t<END))
L+=sub_mix+pad_mix+arp_mix*0.8; Rr+=sub_mix+pad_mix*0.9+arp_mix
# riser before drop + impact at drop and at end
rs=sweep_noise(1.6,400,9000,0.8)*(T(1.6)/1.6)**2.2*0.25
add(L,rs,DROP-1.6); add(Rr,rs,DROP-1.6)
tt=T(1.4); boom=np.sin(2*np.pi*np.cumsum(30+60*np.exp(-tt*9))/SR)*np.exp(-tt*3.2)*0.8
for at in (DROP,END): add(L,boom,at); add(Rr,boom,at)
# intro fade-in quick
fi=np.clip(t/0.05,0,1); L*=fi; Rr*=fi
fo=np.clip((DUR-t)/0.8,0,1); L*=fo; Rr*=fo
M=np.stack([L,Rr],1); M=M/np.abs(M).max()*0.89
wavfile.write('edit/public/music.wav',SR,(M*32767).astype(np.int16))
print("ok")
