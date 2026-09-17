(() => {
  'use strict';

  const OFFICIAL_PUBLICATION_NAME = 'The East-Washington Times';
  const CATEGORIES = ['News','Features','Editorial','Opinion','Sports','Science & Technology','Campus Life','Photojournalism'];
  const CATEGORY_HASHES = {
    News: 'news', Features: 'features', Editorial: 'editorial', Opinion: 'opinion', Sports: 'sports',
    'Science & Technology': 'science', 'Campus Life': 'campus', Photojournalism: 'photojournalism'
  };
  const DEFAULT_SETTINGS = {
    publication_name: 'The East-Washington Times',
    school_name: 'Bagumbayan-East Washington National High School',
    school_abbreviation: 'BEWNHS',
    tagline: 'Student journalism. Campus voices. Stories that matter.',
    publication_history: '', mission: '', vision: ''
  };
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  const config = window.EWT_CONFIG || {};
  const configured = /^https:\/\/.+\.supabase\.co$/i.test(config.SUPABASE_URL || '') &&
    config.SUPABASE_PUBLISHABLE_KEY && !config.SUPABASE_PUBLISHABLE_KEY.includes('YOUR_');
  const db = configured && window.supabase
    ? window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_PUBLISHABLE_KEY)
    : null;

  const state = {
    articles: [], staff: [], achievements: [], gallery: [], settings: {...DEFAULT_SETTINGS},
    currentCategory: '', adminArticles: [], adminStaff: [], adminAchievements: [],
    currentUser: null, currentRole: '', isEditor: false, isAdmin: false, usingDemo: !db
  };
  let coverObjectUrl = '';

  const demoArticles = [
    {id:'demo-1',title:'Headline Placeholder: Your Lead Campus Story',dek:'Use this lead space for the most important verified story from The East-Washington Times newsroom.',body:'This is demo content. Replace it with an original, verified article written and edited by your student publication.',category:'News',author_name:'The East-Washington Times',published_at:'2026-09-16T08:00:00+08:00',cover_image_path:'assets/hero-placeholder.svg',is_featured:true,is_breaking:true,status:'published',demo:true},
    {id:'demo-2',title:'Feature Placeholder: Tell a Student Story With Depth',dek:'Profiles, human-interest stories, and narratives can live here.',body:'This demo feature shows how a student profile or human-interest story can appear.',category:'Features',author_name:'Features Desk',published_at:'2026-09-15T10:00:00+08:00',cover_image_path:'assets/campus-placeholder.svg',status:'published',demo:true},
    {id:'demo-3',title:'Editorial Placeholder: A Clear Institutional Position',dek:'Use the editorial label for the publication’s collective editorial voice.',body:'This is a placeholder editorial.',category:'Editorial',author_name:'Editorial Board',published_at:'2026-09-14T09:00:00+08:00',cover_image_path:'assets/editorial-placeholder.svg',status:'published',demo:true},
    {id:'demo-4',title:'Opinion Placeholder: A Student Column With a Point of View',dek:'Opinion pieces should identify the writer and remain clearly labeled.',body:'This demo entry shows the Opinion section.',category:'Opinion',author_name:'Student Columnist',published_at:'2026-09-13T12:00:00+08:00',cover_image_path:'assets/editorial-placeholder.svg',status:'published',demo:true},
    {id:'demo-5',title:'Sports Placeholder: Cover the Match Beyond the Score',dek:'Highlight student athletes, context, turning points, and verified results.',body:'This is demo sports content.',category:'Sports',author_name:'Sports Desk',published_at:'2026-09-12T16:00:00+08:00',cover_image_path:'assets/sports-placeholder.svg',status:'published',demo:true},
    {id:'demo-6',title:'Science & Tech Placeholder: Explain an Idea Clearly',dek:'A section for research, student innovation, science, and technology coverage.',body:'This is demo science and technology content.',category:'Science & Technology',author_name:'Science & Tech Desk',published_at:'2026-09-11T13:00:00+08:00',cover_image_path:'assets/science-placeholder.svg',status:'published',demo:true},
    {id:'demo-7',title:'Campus Life Placeholder: Capture What Students Experience',dek:'Organizations, events, activities, and everyday school stories belong here.',body:'This is demo campus-life content.',category:'Campus Life',author_name:'Campus Desk',published_at:'2026-09-10T14:00:00+08:00',cover_image_path:'assets/campus-placeholder.svg',status:'published',demo:true},
    {id:'demo-8',title:'Photojournalism Placeholder: Let the Frame Carry the Story',dek:'Strong captions should answer who, what, when, where, and why the moment matters.',body:'This placeholder demonstrates the photojournalism presentation.',category:'Photojournalism',author_name:'Photojournalism Team',published_at:'2026-09-09T15:00:00+08:00',cover_image_path:'assets/photo-placeholder.svg',status:'published',demo:true}
  ];
  const demoStaff = [
    ['Add Editor-in-Chief','Editor-in-Chief','editorial_board'],['Add Associate Editor','Associate Editor','editorial_board'],['Add Managing Editor','Managing Editor','editorial_board'],['Add News Editor','News Editor','editorial_board'],['Add Feature Editor','Feature Editor','editorial_board'],['Add Editorial Editor','Editorial Editor','editorial_board'],['Add Sports Editor','Sports Editor','editorial_board'],['Add Science & Technology Editor','Science & Technology Editor','editorial_board'],['Add Photojournalist','Photojournalist','staff'],['Add Layout Artist','Layout Artist','staff'],['Add Cartoonist','Cartoonist','staff'],['Add Staff Writer','Staff Writer','staff'],['Add School Paper Adviser','School Paper Adviser','adviser']
  ].map((x,i)=>({id:`staff-${i}`,full_name:x[0],position:x[1],group_type:x[2],bio:'Replace this placeholder with the member’s short introduction.',photo_path:'',sort_order:i,demo:true}));
  const demoAchievements = [
    {id:'a1',title:'Add Journalism Achievement',competition_name:'Competition / Recognition',award:'Award or placement',description:'Add verified achievement details here.',demo:true},
    {id:'a2',title:'Add Team Recognition',competition_name:'Division / Regional / National Event',award:'Recognition',description:'Use the admin CMS to add real records.',demo:true},
    {id:'a3',title:'Add Individual Recognition',competition_name:'Journalism Event',award:'Award',description:'Do not publish unverified achievements.',demo:true}
  ];

  function escapeHtml(value='') { return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c])); }
  function clamp(n,min,max){ n=Number(n); return Number.isFinite(n)?Math.min(max,Math.max(min,n)):min; }
  function formatDate(value, options={month:'long',day:'numeric',year:'numeric'}) { if(!value)return''; const d=new Date(value); return Number.isNaN(d.getTime())?'':new Intl.DateTimeFormat('en-PH',options).format(d); }
  function initials(name=''){return name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'EWT';}
  function slugify(s=''){return s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,80)||'story';}
  function showToast(text){const el=$('#toast');el.textContent=text;el.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(()=>el.classList.remove('show'),2400);}
  function showNotice(title,text,type='success',autoClose=true){
    const popup=$('#noticePopup'),icon=$('#noticeIcon'),titleEl=$('#noticeTitle'),textEl=$('#noticeText');
    if(!popup||!icon||!titleEl||!textEl)return;
    titleEl.textContent=title;textEl.textContent=text;
    icon.textContent=type==='error'?'!':'✓';
    popup.classList.toggle('error',type==='error');popup.classList.add('show');popup.setAttribute('aria-hidden','false');
    clearTimeout(showNotice.t);
    if(autoClose)showNotice.t=setTimeout(()=>{popup.classList.remove('show');popup.setAttribute('aria-hidden','true');},3600);
  }
  function hideNotice(){const popup=$('#noticePopup');if(!popup)return;popup.classList.remove('show');popup.setAttribute('aria-hidden','true');clearTimeout(showNotice.t);}
  function enterSite(){
    const gate=$('#startupGate');if(!gate||gate.classList.contains('is-leaving'))return;
    gate.classList.add('is-leaving');document.body.classList.remove('intro-locked');
    setTimeout(()=>{gate.hidden=true;$('#mainContent')?.focus?.({preventScroll:true});},520);
  }
  function setButtonBusy(btn,busy,busyText='Working…'){
    if(!btn)return;
    if(busy){
      if(!btn.dataset.originalText)btn.dataset.originalText=btn.textContent;
      btn.textContent=busyText;btn.disabled=true;btn.classList.add('is-busy');btn.setAttribute('aria-busy','true');
    }else{
      btn.textContent=btn.dataset.originalText||btn.textContent;btn.disabled=false;btn.classList.remove('is-busy');btn.removeAttribute('aria-busy');delete btn.dataset.originalText;
    }
  }
  function setGlobalBusy(busy,text='Working…'){
    const box=$('#globalBusy'),label=$('#globalBusyText');if(!box||!label)return;
    label.textContent=text;box.classList.toggle('hidden',!busy);
  }

  async function subscribeNewsletter(email, website=''){
    if(!db)throw new Error('Email alerts are not connected yet.');
    const {data,error}=await db.functions.invoke('newsletter-subscribe',{body:{email,website,source:'website'}});
    if(error)throw error;
    if(data?.error)throw new Error(data.error);
    return data||{ok:true};
  }

  async function notifyNewsletter(articleId){
    if(!db||!articleId)return {skipped:true};
    const {data,error}=await db.functions.invoke('newsletter-notify',{body:{article_id:articleId}});
    if(error)throw error;
    if(data?.error)throw new Error(data.error);
    return data||{ok:true};
  }

  function openStoryFromUrl(){
    const storyId=new URLSearchParams(location.search).get('story');
    if(!storyId)return;
    const exists=state.articles.some(a=>String(a.id)===String(storyId));
    if(exists)setTimeout(()=>openArticle(storyId),70);
  }

  function normalizeCategory(value=''){
    const raw=String(value).trim();
    const key=raw.toLowerCase().replace(/&/g,'and').replace(/\s+/g,' ');
    const aliases={
      'news':'News','features':'Features','feature':'Features','editorial':'Editorial','opinion':'Opinion','sports':'Sports','sport':'Sports',
      'science and technology':'Science & Technology','science and tech':'Science & Technology','science technology':'Science & Technology','sci-tech':'Science & Technology','sci tech':'Science & Technology',
      'campus life':'Campus Life','campus':'Campus Life','photojournalism':'Photojournalism','photo journalism':'Photojournalism'
    };
    return aliases[key] || raw;
  }
  function isRecentDate(value,days=7){
    const t=new Date(value).getTime(), now=Date.now();
    return Number.isFinite(t) && t<=now && t>=now-days*86400000;
  }
  function mediaUrl(path){
    if(!path)return'assets/hero-placeholder.svg';
    if(/^(https?:|data:|blob:)/.test(path)||path.startsWith('assets/'))return path;
    if(!db)return'assets/hero-placeholder.svg';
    return db.storage.from('journalism-media').getPublicUrl(path).data.publicUrl;
  }
  function coverSettings(a={}){
    const frame=['landscape','portrait','square','auto'].includes(a.cover_frame)?a.cover_frame:'landscape';
    return {zoom:clamp(a.cover_zoom??1,.5,3),x:clamp(a.cover_offset_x??0,-50,50),y:clamp(a.cover_offset_y??0,-50,50),rotation:clamp(a.cover_rotation??0,-180,180),frame};
  }
  function coverStyle(a={}){const s=coverSettings(a);return `--cover-zoom:${s.zoom};--cover-x:${s.x}%;--cover-y:${s.y}%;--cover-rotation:${s.rotation}deg;`;}
  function frameClass(a={}){return `frame-${coverSettings(a).frame}`;}
  function coverHtml(a,wrapper='image-wrap',loading='lazy'){
    return `<div class="${wrapper} media-frame ${frameClass(a)}" style="${coverStyle(a)}"><img src="${escapeHtml(mediaUrl(a.cover_image_path))}" alt="" ${loading?`loading="${loading}"`:''}></div>`;
  }

  async function loadPublicData(){
    if(!db){
      state.articles=demoArticles.map(a=>({...a,category:normalizeCategory(a.category)}));state.staff=demoStaff;state.achievements=demoAchievements;state.settings={...DEFAULT_SETTINGS,publication_name:OFFICIAL_PUBLICATION_NAME};
      state.gallery=[];
      state.usingDemo=true;renderAll();return;
    }
    const [articlesRes,staffRes,achievementsRes,galleryRes,settingsRes]=await Promise.all([
      db.from('articles').select('*').eq('status','published').order('published_at',{ascending:false}),
      db.from('staff_members').select('*').eq('is_active',true).order('sort_order',{ascending:true}),
      db.from('achievements').select('*').eq('is_published',true).order('achievement_date',{ascending:false}),
      db.from('gallery_images').select('*').eq('is_published',true).order('taken_at',{ascending:false}),
      db.from('site_settings').select('*').eq('id',1).maybeSingle()
    ]);
    const results=[articlesRes,staffRes,achievementsRes,galleryRes,settingsRes];
    if(results.some(r=>r.error))console.warn('Some Supabase public data could not be loaded.',results.map(r=>r.error).filter(Boolean));
    state.articles=(articlesRes.data||[]).map(a=>({...a,category:normalizeCategory(a.category)}));
    state.staff=staffRes.data||[];state.achievements=achievementsRes.data||[];state.gallery=galleryRes.data||[];
    state.settings={...DEFAULT_SETTINGS,...(settingsRes.data||{}),publication_name:OFFICIAL_PUBLICATION_NAME};state.usingDemo=false;renderAll();
  }

  function storyMeta(a){return `${escapeHtml(a.author_name||state.settings.publication_name)} · ${escapeHtml(formatDate(a.published_at))}${a.demo?' · <span class="demo-badge">DEMO</span>':''}`;}
  function cardHtml(a){return `<article class="article-card"><button type="button" data-article-id="${escapeHtml(a.id)}">${coverHtml(a)}<span class="section-kicker">${escapeHtml(normalizeCategory(a.category))}</span><h3>${escapeHtml(a.title)}</h3><p>${escapeHtml(a.dek||'')}</p><div class="card-meta">${storyMeta(a)}</div></button></article>`;}
  function getPhotojournalismItems(){
    const articleItems=state.articles
      .filter(a=>normalizeCategory(a.category)==='Photojournalism')
      .map(a=>({kind:'article',id:`article-${a.id}`,article_id:a.id,title:a.title,caption:a.dek,photographer:a.author_name,image_path:a.cover_image_path,taken_at:a.published_at,article:a,demo:a.demo}));
    const galleryItems=state.gallery.map(p=>({kind:'gallery',...p,taken_at:p.taken_at||p.created_at}));
    return [...articleItems,...galleryItems].sort((a,b)=>new Date(b.taken_at||0)-new Date(a.taken_at||0));
  }
  function photoTileHtml(p){
    const media=p.kind==='article'
      ? `<div class="photo-media media-frame ${frameClass(p.article)}" style="${coverStyle(p.article)}"><img src="${escapeHtml(mediaUrl(p.image_path))}" alt="${escapeHtml(p.title||'Photojournalism image')}" loading="lazy"></div>`
      : `<img src="${escapeHtml(mediaUrl(p.image_path))}" alt="${escapeHtml(p.title||'Photojournalism image')}" loading="lazy">`;
    const action=p.kind==='article'
      ? `<button data-article-id="${escapeHtml(p.article_id)}" aria-label="Read ${escapeHtml(p.title||'photojournalism story')}"></button>`
      : `<button data-photo-id="${escapeHtml(p.id)}" aria-label="View ${escapeHtml(p.title||'photo')}"></button>`;
    return `<figure class="photo-tile">${media}${action}<figcaption class="photo-caption"><strong>${escapeHtml(p.title||'Photojournalism')}</strong><span>${escapeHtml(p.photographer||OFFICIAL_PUBLICATION_NAME)}</span>${p.demo?'<span class="demo-badge"> DEMO</span>':''}</figcaption></figure>`;
  }
  function galleryItemHtml(p){
    if(p.kind==='article'){
      return `<figure class="gallery-item"><button data-article-id="${escapeHtml(p.article_id)}"><div class="gallery-media media-frame ${frameClass(p.article)}" style="${coverStyle(p.article)}"><img src="${escapeHtml(mediaUrl(p.image_path))}" alt="${escapeHtml(p.title||'Photojournalism story')}" loading="lazy"></div><figcaption><strong>${escapeHtml(p.title||'Photojournalism')}</strong><br><span>${escapeHtml(p.caption||'')}</span><br><small>Read visual story →</small></figcaption></button></figure>`;
    }
    return `<figure class="gallery-item"><button data-photo-id="${escapeHtml(p.id)}"><img src="${escapeHtml(mediaUrl(p.image_path))}" alt="${escapeHtml(p.title||'Photojournalism image')}" loading="lazy"><figcaption><strong>${escapeHtml(p.title||'Photojournalism')}</strong><br><span>${escapeHtml(p.caption||'')}</span></figcaption></button></figure>`;
  }
  function renderHome(){
    const sorted=[...state.articles].sort((a,b)=>new Date(b.published_at)-new Date(a.published_at));
    const featured=sorted.filter(a=>a.is_featured);
    const lead=featured[0]||sorted[0];
    if(lead){
      $('#leadStory').innerHTML=`<div class="lead-media media-frame ${frameClass(lead)}" style="${coverStyle(lead)}"><img src="${escapeHtml(mediaUrl(lead.cover_image_path))}" alt=""></div><div class="lead-overlay"><span class="story-tag">${escapeHtml(lead.category)}</span><h2>${escapeHtml(lead.title)}</h2><p>${escapeHtml(lead.dek||'')}</p><div class="story-meta">${storyMeta(lead)}</div></div><button class="story-button" aria-label="Read ${escapeHtml(lead.title)}" data-article-id="${escapeHtml(lead.id)}"></button>`;
      $('#leadStory').classList.remove('skeleton-card');
    }else{$('#leadStory').innerHTML='<div class="empty-hero"><span class="section-kicker light">Newsroom</span><h2>No published stories yet.</h2><p>Authorized staff can publish the first story from the CMS.</p></div>';}
    const top=sorted.filter(a=>a.id!==lead?.id).slice(0,4);
    $('#topStoriesList').innerHTML=top.map(a=>`<article class="top-story"><button data-article-id="${escapeHtml(a.id)}"><span class="section-kicker">${escapeHtml(a.category)}</span><h3>${escapeHtml(a.title)}</h3><p>${escapeHtml(formatDate(a.published_at))}</p></button></article>`).join('')||'<p class="muted">No additional stories yet.</p>';
    $('#latestGrid').innerHTML=sorted.filter(a=>a.id!==lead?.id).slice(0,6).map(cardHtml).join('')||'<p class="muted">No additional published stories yet.</p>';

    const editorial=sorted.find(a=>a.category==='Editorial')||sorted.find(a=>a.category==='Opinion');
    $('#homeEditorialSection').classList.toggle('hidden',!editorial);
    $('#editorialFeature').innerHTML=editorial?`<button data-article-id="${escapeHtml(editorial.id)}"><span class="section-kicker light">${escapeHtml(editorial.category)}</span><h3>${escapeHtml(editorial.title)}</h3><p>${escapeHtml(editorial.dek||'')}</p><span>Read piece →</span></button>`:'';

    const campus=sorted.filter(a=>a.category==='Campus Life').slice(0,3);
    const sports=sorted.filter(a=>a.category==='Sports').slice(0,3);
    $('#campusPanel').classList.toggle('hidden',!campus.length);
    $('#sportsPanel').classList.toggle('hidden',!sports.length);
    $('#campusSportsSection').classList.toggle('hidden',!(campus.length||sports.length));
    renderStacked('#campusList',campus);renderStacked('#sportsList',sports);

    const photos=getPhotojournalismItems();
    $('#homePhotoSection').classList.toggle('hidden',!photos.length);
    renderPhotoStrip(photos);

    const board=state.staff.filter(s=>s.group_type==='editorial_board');
    $('#homeBoardSection').classList.toggle('hidden',!board.length && !state.usingDemo);
    renderBoard(board);
  }
  function renderStacked(sel,arr){$(sel).innerHTML=arr.length?arr.map(a=>`<article class="stacked-story">${coverHtml(a,'stacked-media')}<button data-article-id="${escapeHtml(a.id)}"><span class="section-kicker">${escapeHtml(a.category)}</span><h3>${escapeHtml(a.title)}</h3><small>${escapeHtml(formatDate(a.published_at))}</small></button></article>`).join(''):'';}
  function renderPhotoStrip(items=getPhotojournalismItems()){const photos=items.slice(0,5);$('#photoStrip').innerHTML=photos.map(photoTileHtml).join('');}
  function renderBoard(prefetched){const board=prefetched||state.staff.filter(s=>s.group_type==='editorial_board').slice(0,8);const arr=board.length?board:(state.usingDemo?demoStaff.slice(0,8):[]);$('#boardGrid').innerHTML=arr.map(staffCardHtml).join('');}
  function staffCardHtml(s){const avatar=s.photo_path?`<img src="${escapeHtml(mediaUrl(s.photo_path))}" alt="${escapeHtml(s.full_name)}">`:escapeHtml(initials(s.full_name));return `<article class="staff-card"><div class="staff-avatar">${avatar}</div><div class="staff-copy"><h3>${escapeHtml(s.full_name)}</h3><div class="staff-role">${escapeHtml(s.position)}</div>${s.bio?`<p>${escapeHtml(s.bio)}</p>`:''}${s.demo?'<span class="demo-badge">DEMO</span>':''}</div></article>`;}
  function renderPhotosPage(){const items=getPhotojournalismItems();$('#photoGallery').innerHTML=items.length?items.map(galleryItemHtml).join(''):'<p>No photojournalism stories have been published yet.</p>';}
  function renderBranding(){
    state.settings.publication_name=OFFICIAL_PUBLICATION_NAME;
    const s=state.settings;
    document.title=`${OFFICIAL_PUBLICATION_NAME} | ${s.school_abbreviation}`;
    const pairs=[['#publicationNameMasthead',OFFICIAL_PUBLICATION_NAME],['#schoolNameMasthead',s.school_name],['#publicationTaglineMasthead',s.tagline],['#aboutPagePublicationName',OFFICIAL_PUBLICATION_NAME],['#aboutSchoolAbbreviation',s.school_abbreviation],['#aboutSchoolName',s.school_name],['#aboutPublicationName',OFFICIAL_PUBLICATION_NAME],['#aboutPublicationTagline',s.tagline],['#footerPublicationName',OFFICIAL_PUBLICATION_NAME],['#footerSchoolName',s.school_name],['#footerPublicationInline',OFFICIAL_PUBLICATION_NAME],['#footerSchoolAbbreviation',s.school_abbreviation]];
    pairs.forEach(([sel,val])=>{const el=$(sel);if(el)el.textContent=val||'';});
    const intro=$('#aboutPageIntro');if(intro)intro.textContent=`The student publication of ${s.school_name} (${s.school_abbreviation}).`;
    const searchLabel=$('label[for="globalSearch"]');if(searchLabel)searchLabel.textContent=`Search ${OFFICIAL_PUBLICATION_NAME}`;
  }
  function renderAbout(){
    renderBranding();const s=state.settings;
    $('#aboutHistory').textContent=s.publication_history||`This site is the digital home of ${s.publication_name}. An administrator can add the verified publication history from the CMS.`;
    [['#aboutMissionWrap','#aboutMission',s.mission],['#aboutVisionWrap','#aboutVision',s.vision]].forEach(([wrapSel,textSel,val])=>{const wrap=$(wrapSel),text=$(textSel);if(val){text.textContent=val;wrap.classList.remove('hidden');}else{wrap.classList.add('hidden');text.textContent='';}});
    $('#achievementGrid').innerHTML=state.achievements.length?state.achievements.map(a=>`<article class="achievement-card">${a.image_path?`<img class="achievement-image" src="${escapeHtml(mediaUrl(a.image_path))}" alt="">`:''}<span class="mini-label">${escapeHtml(a.competition_name||'Achievement')}</span><h3>${escapeHtml(a.title||a.award||'Recognition')}</h3>${a.award?`<p><strong>${escapeHtml(a.award)}</strong></p>`:''}${a.level?`<p>${escapeHtml(a.level)}</p>`:''}${a.achievement_date?`<p>${escapeHtml(formatDate(a.achievement_date))}</p>`:''}<p>${escapeHtml(a.description||'')}</p>${a.demo?'<span class="demo-badge">DEMO</span>':''}</article>`).join(''):'<p class="muted">No journalism achievements have been added yet.</p>';
    const order={editorial_board:0,staff:1,adviser:2};const staff=[...state.staff].sort((a,b)=>(order[a.group_type]??9)-(order[b.group_type]??9)||(a.sort_order??0)-(b.sort_order??0));
    $('#fullStaffGrid').innerHTML=staff.length?staff.map(staffCardHtml).join(''):'<p class="muted">Staff information has not been added yet.</p>';
  }
  function renderArchives(){const categories=[...new Set(state.articles.map(a=>normalizeCategory(a.category)))].sort();const years=[...new Set(state.articles.map(a=>new Date(a.published_at).getFullYear()).filter(Boolean))].sort((a,b)=>b-a);$('#archiveCategory').innerHTML='<option value="">All categories</option>'+categories.map(c=>`<option>${escapeHtml(c)}</option>`).join('');$('#archiveYear').innerHTML='<option value="">All years</option>'+years.map(y=>`<option>${y}</option>`).join('');filterArchives();}
  function filterArchives(){const q=($('#archiveSearch').value||'').trim().toLowerCase(),c=normalizeCategory($('#archiveCategory').value),y=$('#archiveYear').value;const arr=state.articles.filter(a=>(!c||normalizeCategory(a.category)===c)&&(!y||String(new Date(a.published_at).getFullYear())===y)&&(!q||[a.title,a.dek,a.author_name,normalizeCategory(a.category)].some(v=>String(v||'').toLowerCase().includes(q))));$('#archiveGrid').innerHTML=arr.map(a=>`<article class="archive-row"><div class="archive-date">${escapeHtml(formatDate(a.published_at))}</div><button data-article-id="${escapeHtml(a.id)}"><span class="section-kicker">${escapeHtml(a.category)}</span><h3>${escapeHtml(a.title)}</h3><small>${escapeHtml(a.author_name||'')}</small></button><button class="text-btn" data-article-id="${escapeHtml(a.id)}">Read →</button></article>`).join('')||'<p>No matching stories.</p>';}
  function renderCategory(category){category=normalizeCategory(category);state.currentCategory=category;$('#categoryTitle').textContent=category;const arr=state.articles.filter(a=>normalizeCategory(a.category)===category);$('#categoryGrid').innerHTML=arr.length?arr.map(cardHtml).join(''):'<p>No published stories in this section yet.</p>';}
  function renderBreaking(){const breaking=state.articles.find(a=>a.is_breaking);if(!breaking){$('#breakingBar').classList.add('hidden');return;}$('#breakingHeadline').textContent=breaking.title;$('#breakingHeadline').dataset.articleId=breaking.id;$('#breakingBar').classList.remove('hidden');}
  function renderDynamicNav(){
    $$('[data-recent-category]').forEach(link=>{
      const cat=normalizeCategory(link.dataset.recentCategory);
      let has=state.articles.some(a=>normalizeCategory(a.category)===cat&&isRecentDate(a.published_at,7));
      if(cat==='Photojournalism')has=has||state.gallery.some(p=>isRecentDate(p.taken_at||p.created_at,7));
      link.hidden=!has;link.setAttribute('aria-hidden',String(!has));
    });
  }
  function renderAll(){renderBranding();renderHome();renderPhotosPage();renderAbout();renderArchives();renderBreaking();renderDynamicNav();applyCurrentHash();}

  function openArticle(id){const a=state.articles.find(x=>String(x.id)===String(id))||state.adminArticles.find(x=>String(x.id)===String(id));if(!a)return;const paragraphs=String(a.body||'').split(/\n{2,}/).filter(Boolean).map(p=>`<p>${escapeHtml(p).replace(/\n/g,'<br>')}</p>`).join('');$('#articleReader').innerHTML=`<header class="reader-header"><span class="story-tag">${escapeHtml(normalizeCategory(a.category))}</span><h1>${escapeHtml(a.title)}</h1><p class="reader-dek">${escapeHtml(a.dek||'')}</p><div class="reader-meta">By ${escapeHtml(a.author_name||state.settings.publication_name)} · ${escapeHtml(formatDate(a.published_at))}${a.demo?' · DEMO':''}</div></header><div class="reader-cover-frame media-frame ${frameClass(a)}" style="${coverStyle(a)}"><img src="${escapeHtml(mediaUrl(a.cover_image_path))}" alt=""></div><div class="reader-body">${paragraphs||'<p>Article body has not been added yet.</p>'}</div>`;$('#articleDialog').showModal();}
  function openPhoto(id){const p=state.gallery.find(x=>String(x.id)===String(id));if(!p)return;$('#photoViewer').className='photo-viewer';$('#photoViewer').innerHTML=`<img src="${escapeHtml(mediaUrl(p.image_path))}" alt="${escapeHtml(p.title||'Photojournalism image')}"><div class="photo-detail"><span class="section-kicker light">Photojournalism</span><h2>${escapeHtml(p.title||'Untitled')}</h2><p>${escapeHtml(p.caption||'')}</p><p><strong>Photo:</strong> ${escapeHtml(p.photographer||state.settings.publication_name)}</p><p>${escapeHtml(formatDate(p.taken_at))}</p>${p.demo?'<span class="demo-badge">DEMO</span>':''}</div>`;$('#photoDialog').showModal();}
  function openView(route,category=''){$$('.view').forEach(v=>v.classList.remove('active-view'));$$('.main-nav a').forEach(a=>a.classList.remove('active'));if(category){renderCategory(category);$('#categoryView').classList.add('active-view');$(`.main-nav a[data-category="${CSS.escape(normalizeCategory(category))}"]`)?.classList.add('active');}else{const map={home:'#homeView',photojournalism:'#photoView',archives:'#archivesView',about:'#aboutView'};$(map[route]||'#homeView').classList.add('active-view');$(`.main-nav a[data-route="${route}"]`)?.classList.add('active');}window.scrollTo({top:0,behavior:'smooth'});}
  function applyCurrentHash(){const hash=location.hash.replace('#','');const reverse=Object.fromEntries(Object.entries(CATEGORY_HASHES).filter(([c])=>c!=='Photojournalism').map(([c,h])=>[h,c]));if(reverse[hash])openView('',reverse[hash]);else if(['photojournalism','archives','about'].includes(hash))openView(hash);else openView('home');}
  function runSearch(){const q=$('#globalSearch').value.trim().toLowerCase(),out=$('#searchResults');if(!q){out.innerHTML='';return;}const results=state.articles.filter(a=>[a.title,a.dek,a.body,a.author_name,normalizeCategory(a.category)].some(v=>String(v||'').toLowerCase().includes(q))).slice(0,8);out.innerHTML=results.length?results.map(a=>`<button class="search-result" data-article-id="${escapeHtml(a.id)}"><span><strong>${escapeHtml(a.title)}</strong><br><small>${escapeHtml(normalizeCategory(a.category))} · ${escapeHtml(a.author_name||'')}</small></span><span>→</span></button>`).join(''):'<p>No matching stories.</p>';}

  async function uploadMedia(file,folder){if(!db||!file)return'';const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');const path=`${folder}/${crypto.randomUUID()}.${ext}`;const {error}=await db.storage.from('journalism-media').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type||undefined});if(error)throw error;return path;}
  async function refreshAdminUser(){if(!db){state.currentUser=null;state.currentRole='';state.isEditor=false;state.isAdmin=false;return;}const {data:{user}}=await db.auth.getUser();state.currentUser=user||null;state.currentRole='';state.isEditor=false;state.isAdmin=false;if(user){const {data,error}=await db.from('profiles').select('role,display_name').eq('id',user.id).maybeSingle();if(!error){state.currentRole=data?.role||'';state.isEditor=['editor','admin'].includes(state.currentRole);state.isAdmin=state.currentRole==='admin';}}updateAdminPane();}
  function updateAdminPane(){
    const authPane=$('#adminAuthPane'),dash=$('#adminDashboard'),topAccess=$('#adminToggle'),footerAccess=$('#cmsAccessLink');
    if(state.currentUser&&state.isEditor){
      const roleLabel=state.isAdmin?'ADMIN':'EDITOR';
      authPane.classList.add('hidden');dash.classList.remove('hidden');
      $('#signedInRole').textContent=roleLabel;
      if(topAccess){topAccess.textContent=`${roleLabel} CMS`;topAccess.classList.remove('hidden');}
      if(footerAccess)footerAccess.textContent=`Open ${roleLabel} CMS`;
      $$('[data-admin-only]').forEach(el=>el.classList.toggle('hidden',!state.isAdmin));
      if(!state.isAdmin&&$('.admin-tab.active[data-admin-only]'))switchAdminTab('articles');
      loadAdminData();
    }else{
      authPane.classList.remove('hidden');dash.classList.add('hidden');
      if(topAccess){topAccess.textContent='CMS';topAccess.classList.add('hidden');}
      if(footerAccess)footerAccess.textContent='Editorial access';
    }
  }
  async function loadAdminData(){if(!db||!state.isEditor)return;const promises=[db.from('articles').select('*').order('updated_at',{ascending:false}),db.from('staff_members').select('*').order('sort_order',{ascending:true})];if(state.isAdmin){promises.push(db.from('achievements').select('*').order('achievement_date',{ascending:false}));promises.push(db.from('site_settings').select('*').eq('id',1).maybeSingle());}const results=await Promise.all(promises);state.adminArticles=(results[0].data||[]).map(a=>({...a,category:normalizeCategory(a.category)}));state.adminStaff=results[1].data||[];if(state.isAdmin){state.adminAchievements=results[2].data||[];state.settings={...DEFAULT_SETTINGS,...(results[3].data||state.settings),publication_name:OFFICIAL_PUBLICATION_NAME};populatePublicationForm();}renderAdminLists();}
  function renderAdminLists(){
    const count=state.adminArticles.length;const countEl=$('#articleCount');if(countEl)countEl.textContent=`${count} ${count===1?'story':'stories'}`;
    $('#adminArticleList').innerHTML=state.adminArticles.map(a=>`<div class="admin-row"><div><h4>${escapeHtml(a.title)}</h4><small>${escapeHtml(normalizeCategory(a.category))} · ${escapeHtml(a.status)} · ${escapeHtml(formatDate(a.published_at))}</small></div><div class="row-actions"><button data-edit-article="${escapeHtml(a.id)}">Edit</button><button class="danger" data-delete-article="${escapeHtml(a.id)}">Delete</button></div></div>`).join('')||'<p class="muted">No articles yet.</p>';
    $('#adminStaffList').innerHTML=state.adminStaff.map(s=>`<div class="admin-row"><div><h4>${escapeHtml(s.full_name)}</h4><small>${escapeHtml(s.position)} · ${escapeHtml(s.group_type)}</small></div><div class="row-actions"><button class="danger" data-delete-staff="${escapeHtml(s.id)}">Delete</button></div></div>`).join('')||'<p>No staff members yet.</p>';
    if(state.isAdmin)$('#adminAchievementList').innerHTML=state.adminAchievements.map(a=>`<div class="admin-row"><div><h4>${escapeHtml(a.title)}</h4><small>${escapeHtml(a.competition_name||'Achievement')}${a.achievement_date?' · '+escapeHtml(formatDate(a.achievement_date)):''}</small></div><div class="row-actions"><button data-edit-achievement="${escapeHtml(a.id)}">Edit</button><button class="danger" data-delete-achievement="${escapeHtml(a.id)}">Delete</button></div></div>`).join('')||'<p>No achievements yet.</p>';
  }
  function switchAdminTab(name){const target=$(`.admin-tab[data-admin-tab="${name}"]`);if(!target||target.hidden||target.classList.contains('hidden'))return;$$('.admin-tab').forEach(b=>b.classList.remove('active'));$$('.admin-tab-panel').forEach(p=>p.classList.remove('active'));target.classList.add('active');const id='#admin'+name[0].toUpperCase()+name.slice(1);$(id)?.classList.add('active');}

  function setCoverControls(values={}){const s=coverSettings(values);$('#coverZoom').value=s.zoom;$('#coverX').value=s.x;$('#coverY').value=s.y;$('#coverRotation').value=s.rotation;$('#coverFrame').value=s.frame;updateCoverPreview();}
  function getCoverControls(){return {cover_zoom:Number($('#coverZoom').value),cover_offset_x:Number($('#coverX').value),cover_offset_y:Number($('#coverY').value),cover_rotation:Number($('#coverRotation').value),cover_frame:$('#coverFrame').value};}
  function updateCoverPreview(){const vals=getCoverControls(),s=coverSettings(vals),frame=$('#coverPreviewFrame'),img=$('#articleCoverPreview');frame.className=`cover-preview media-frame frame-${s.frame}`;frame.setAttribute('style',coverStyle(vals));$('#coverZoomValue').textContent=`${s.zoom.toFixed(2)}×`;$('#coverXValue').textContent=String(s.x);$('#coverYValue').textContent=String(s.y);$('#coverRotationValue').textContent=`${s.rotation}°`;img.style.transform='';}
  function resetArticleForm(){if(coverObjectUrl){URL.revokeObjectURL(coverObjectUrl);coverObjectUrl='';}$('#articleForm').reset();$('#articleId').value='';$('#articleDate').value='';$('#articleFormMessage').textContent='';$('#articleCoverPreview').src='assets/hero-placeholder.svg';setCoverControls({cover_zoom:1,cover_offset_x:0,cover_offset_y:0,cover_rotation:0,cover_frame:'landscape'});}
  function editArticle(id){const a=state.adminArticles.find(x=>String(x.id)===String(id));if(!a)return;$('#articleId').value=a.id;$('#articleTitle').value=a.title||'';$('#articleCategory').value=normalizeCategory(a.category)||'News';$('#articleAuthor').value=a.author_name||'';$('#articleDek').value=a.dek||'';$('#articleBody').value=a.body||'';$('#articleFeatured').checked=!!a.is_featured;$('#articleBreaking').checked=!!a.is_breaking;$('#articleStatus').value=a.status||'draft';$('#articleCoverPreview').src=mediaUrl(a.cover_image_path);setCoverControls(a);if(a.published_at){const d=new Date(a.published_at),local=new Date(d.getTime()-d.getTimezoneOffset()*60000);$('#articleDate').value=local.toISOString().slice(0,16);}switchAdminTab('articles');$('#articleForm').scrollIntoView({behavior:'smooth',block:'start'});}
  async function handleArticleSubmit(e){
    e.preventDefault();if(!db||!state.isEditor)return;
    const btn=e.submitter;$('#articleFormMessage').textContent='';
    setButtonBusy(btn,true,'Preparing…');setGlobalBusy(true,'Preparing article…');
    try{
      const id=$('#articleId').value,existing=id?state.adminArticles.find(a=>String(a.id)===String(id)):null;
      let cover=existing?.cover_image_path||'';const file=$('#articleCover').files[0];
      if(file){setButtonBusy(btn,true,'Uploading image…');setGlobalBusy(true,'Uploading cover image…');cover=await uploadMedia(file,'articles');}
      const title=$('#articleTitle').value.trim(),status=$('#articleStatus').value;
      const shouldNotify=status==='published'&&existing?.status!=='published';
      setButtonBusy(btn,true,status==='published'?'Publishing…':'Saving draft…');setGlobalBusy(true,status==='published'?'Publishing article…':'Saving article draft…');
      const payload={title,slug:existing?.slug||`${slugify(title)}-${Date.now().toString(36)}`,category:normalizeCategory($('#articleCategory').value),author_name:$('#articleAuthor').value.trim(),dek:$('#articleDek').value.trim(),body:$('#articleBody').value.trim(),cover_image_path:cover,published_at:$('#articleDate').value?new Date($('#articleDate').value).toISOString():new Date().toISOString(),is_featured:$('#articleFeatured').checked,is_breaking:$('#articleBreaking').checked,status,updated_by:state.currentUser.id,...getCoverControls()};
      const res=id
        ? await db.from('articles').update(payload).eq('id',id).select('id').single()
        : await db.from('articles').insert({...payload,created_by:state.currentUser.id}).select('id').single();
      if(res.error)throw res.error;
      const savedArticleId=res.data?.id||id;
      let alertNote='';
      if(shouldNotify&&savedArticleId){
        setButtonBusy(btn,true,'Sending alerts…');setGlobalBusy(true,'Sending subscriber alerts…');
        try{
          const alertResult=await notifyNewsletter(savedArticleId);
          if(alertResult?.sent_count>0)alertNote=` Subscriber alert sent to ${alertResult.sent_count} reader${alertResult.sent_count===1?'':'s'}.`;
          else if(alertResult?.already_sent)alertNote=' Subscriber alert was already sent.';
          else alertNote=' No active subscribers yet.';
        }catch(alertErr){
          console.warn('Newsletter alert could not be sent.',alertErr);
          alertNote=' Article is live, but the subscriber email alert could not be sent.';
        }
      }
      $('#articleFormMessage').textContent=(status==='published'?'Article published.':'Draft saved.')+alertNote;
      resetArticleForm();
      setGlobalBusy(true,'Refreshing front page…');await Promise.all([loadAdminData(),loadPublicData()]);showToast(status==='published'?'Article published':'Draft saved');
    }catch(err){console.error(err);$('#articleFormMessage').textContent=err.message||'Could not save article.';}
    finally{setButtonBusy(btn,false);setGlobalBusy(false);}
  }
  async function handleStaffSubmit(e){e.preventDefault();if(!db||!state.isEditor)return;const btn=e.submitter;setButtonBusy(btn,true,'Adding…');setGlobalBusy(true,'Adding team member…');try{let photo='';const file=$('#staffPhoto').files[0];if(file){setButtonBusy(btn,true,'Uploading photo…');setGlobalBusy(true,'Uploading staff photo…');photo=await uploadMedia(file,'staff');}const payload={full_name:$('#staffName').value.trim(),position:$('#staffRole').value.trim(),group_type:$('#staffGroup').value,bio:$('#staffBio').value.trim(),photo_path:photo,is_active:true,sort_order:(state.adminStaff.at(-1)?.sort_order??0)+10,created_by:state.currentUser.id};const {error}=await db.from('staff_members').insert(payload);if(error)throw error;$('#staffForm').reset();$('#staffFormMessage').textContent='Member added.';await Promise.all([loadAdminData(),loadPublicData()]);showToast('Editorial board updated');}catch(err){console.error(err);$('#staffFormMessage').textContent=err.message||'Could not add member.';}finally{setButtonBusy(btn,false);setGlobalBusy(false);}}

  function populatePublicationForm(){if(!state.isAdmin)return;const s=state.settings;$('#settingPublicationName').value=OFFICIAL_PUBLICATION_NAME;$('#settingTagline').value=s.tagline||'';$('#settingSchoolName').value=s.school_name||DEFAULT_SETTINGS.school_name;$('#settingSchoolAbbreviation').value=s.school_abbreviation||DEFAULT_SETTINGS.school_abbreviation;$('#settingHistory').value=s.publication_history||'';$('#settingMission').value=s.mission||'';$('#settingVision').value=s.vision||'';}
  async function handlePublicationSubmit(e){e.preventDefault();if(!db||!state.isAdmin)return;const btn=e.submitter;setButtonBusy(btn,true,'Saving…');try{const payload={publication_name:OFFICIAL_PUBLICATION_NAME,tagline:$('#settingTagline').value.trim(),school_name:$('#settingSchoolName').value.trim(),school_abbreviation:$('#settingSchoolAbbreviation').value.trim(),publication_history:$('#settingHistory').value.trim(),mission:$('#settingMission').value.trim(),vision:$('#settingVision').value.trim()};const {error}=await db.from('site_settings').update(payload).eq('id',1);if(error)throw error;state.settings={...state.settings,...payload};$('#publicationFormMessage').textContent='Publication details saved.';renderAbout();showToast('Publication details updated');}catch(err){console.error(err);$('#publicationFormMessage').textContent=err.message||'Could not save publication details.';}finally{setButtonBusy(btn,false);}}
  function resetAchievementForm(){$('#achievementForm').reset();$('#achievementId').value='';$('#achievementPublished').checked=true;$('#achievementFormMessage').textContent='';}
  function editAchievement(id){if(!state.isAdmin)return;const a=state.adminAchievements.find(x=>String(x.id)===String(id));if(!a)return;$('#achievementId').value=a.id;$('#achievementTitle').value=a.title||'';$('#achievementCompetition').value=a.competition_name||'';$('#achievementAward').value=a.award||'';$('#achievementLevel').value=a.level||'';$('#achievementDate').value=a.achievement_date||'';$('#achievementDescription').value=a.description||'';$('#achievementPublished').checked=!!a.is_published;switchAdminTab('achievements');$('#achievementForm').scrollIntoView({behavior:'smooth',block:'start'});}
  async function handleAchievementSubmit(e){e.preventDefault();if(!db||!state.isAdmin)return;const btn=e.submitter;setButtonBusy(btn,true,'Saving…');setGlobalBusy(true,'Saving achievement…');try{const id=$('#achievementId').value,existing=id?state.adminAchievements.find(a=>String(a.id)===String(id)):null;let image=existing?.image_path||'';const file=$('#achievementImage').files[0];if(file){setButtonBusy(btn,true,'Uploading image…');setGlobalBusy(true,'Uploading achievement image…');image=await uploadMedia(file,'achievements');}const payload={title:$('#achievementTitle').value.trim(),competition_name:$('#achievementCompetition').value.trim(),award:$('#achievementAward').value.trim(),level:$('#achievementLevel').value.trim(),achievement_date:$('#achievementDate').value||null,description:$('#achievementDescription').value.trim(),image_path:image,is_published:$('#achievementPublished').checked};const res=id?await db.from('achievements').update(payload).eq('id',id):await db.from('achievements').insert({...payload,created_by:state.currentUser.id});if(res.error)throw res.error;resetAchievementForm();await Promise.all([loadAdminData(),loadPublicData()]);showToast('Achievement saved');}catch(err){console.error(err);$('#achievementFormMessage').textContent=err.message||'Could not save achievement.';}finally{setButtonBusy(btn,false);setGlobalBusy(false);}}

  async function openCmsDialog(){
    if(!db){$('#loginMessage').textContent='Supabase is not configured yet. Add your Project URL and publishable key to config.js first.';}
    else await refreshAdminUser();
    if(!$('#adminDialog').open)$('#adminDialog').showModal();
  }

  function bindEvents(){
    document.addEventListener('click',async e=>{
      const articleBtn=e.target.closest('[data-article-id]');if(articleBtn){openArticle(articleBtn.dataset.articleId);return;}
      const photoBtn=e.target.closest('[data-photo-id]');if(photoBtn){openPhoto(photoBtn.dataset.photoId);return;}
      const routeBtn=e.target.closest('[data-open-route]');if(routeBtn){location.hash=routeBtn.dataset.openRoute;return;}
      const navCat=e.target.closest('.main-nav [data-category]');if(navCat){e.preventDefault();const cat=normalizeCategory(navCat.dataset.category);location.hash=CATEGORY_HASHES[cat]||'home';$('#mainNav').classList.remove('open');$('#menuToggle').setAttribute('aria-expanded','false');return;}
      const navRoute=e.target.closest('.main-nav [data-route], .brand[data-route]');if(navRoute){e.preventDefault();location.hash=navRoute.getAttribute('href');$('#mainNav').classList.remove('open');return;}
      const close=e.target.closest('[data-close-dialog]');if(close){$('#'+close.dataset.closeDialog)?.close();return;}
      const edit=e.target.closest('[data-edit-article]');if(edit){editArticle(edit.dataset.editArticle);return;}
      const del=e.target.closest('[data-delete-article]');if(del){
        if(!confirm('Delete this article?'))return;
        setButtonBusy(del,true,'Deleting…');setGlobalBusy(true,'Deleting article…');
        try{
          const {error}=await db.from('articles').delete().eq('id',del.dataset.deleteArticle);
          if(error)throw error;
          setGlobalBusy(true,'Refreshing article library…');await Promise.all([loadAdminData(),loadPublicData()]);showToast('Article deleted');
        }catch(err){console.error(err);showNotice('Delete failed',err.message||'Could not delete the article.','error');}
        finally{setButtonBusy(del,false);setGlobalBusy(false);}
        return;
      }
      const ds=e.target.closest('[data-delete-staff]');if(ds){if(!confirm('Remove this staff member?'))return;const {error}=await db.from('staff_members').delete().eq('id',ds.dataset.deleteStaff);if(error)showToast(error.message);else{await Promise.all([loadAdminData(),loadPublicData()]);showToast('Staff member removed');}return;}
      const ea=e.target.closest('[data-edit-achievement]');if(ea){editAchievement(ea.dataset.editAchievement);return;}
      const da=e.target.closest('[data-delete-achievement]');if(da){if(!state.isAdmin||!confirm('Delete this achievement?'))return;const {error}=await db.from('achievements').delete().eq('id',da.dataset.deleteAchievement);if(error)showToast(error.message);else{await Promise.all([loadAdminData(),loadPublicData()]);showToast('Achievement deleted');}return;}
      const rotate=e.target.closest('[data-rotate-cover]');if(rotate){let v=Number($('#coverRotation').value)+Number(rotate.dataset.rotateCover);while(v>180)v-=360;while(v<-180)v+=360;$('#coverRotation').value=v;updateCoverPreview();return;}
    });
    $('#menuToggle').addEventListener('click',()=>{const nav=$('#mainNav');nav.classList.toggle('open');$('#menuToggle').setAttribute('aria-expanded',String(nav.classList.contains('open')));});
    $('#searchToggle').addEventListener('click',()=>{$('#searchPanel').classList.add('open');$('#searchPanel').setAttribute('aria-hidden','false');setTimeout(()=>$('#globalSearch').focus(),20);});
    $('#searchClose').addEventListener('click',()=>{$('#searchPanel').classList.remove('open');$('#searchPanel').setAttribute('aria-hidden','true');});
    $('#globalSearch').addEventListener('input',runSearch);$('#archiveSearch').addEventListener('input',filterArchives);$('#archiveCategory').addEventListener('change',filterArchives);$('#archiveYear').addEventListener('change',filterArchives);
    $('#adminToggle').addEventListener('click',openCmsDialog);
    $('#cmsAccessLink').addEventListener('click',openCmsDialog);
    $('#newsletterForm').addEventListener('submit',async e=>{
      e.preventDefault();
      const form=e.currentTarget,btn=form.querySelector('button[type="submit"]'),msg=$('#newsletterMessage');
      const email=$('#newsletterEmail').value.trim(),website=$('#newsletterWebsite').value.trim();
      msg.textContent='';setButtonBusy(btn,true,'Subscribing…');
      try{
        await subscribeNewsletter(email,website);
        form.reset();msg.textContent='Subscription successful.';
        showNotice('You’re subscribed','We’ll send a short alert when The East-Washington Times publishes a new article.');
      }catch(err){
        console.error(err);const message=err.message||'Could not subscribe right now. Please try again.';msg.textContent=message;showNotice('Subscription failed',message,'error');
      }finally{setButtonBusy(btn,false);}
    });
    $('#noticeClose').addEventListener('click',hideNotice);
    $('#enterSiteBtn').addEventListener('click',enterSite);
    document.addEventListener('keydown',e=>{const gate=$('#startupGate');if(e.key==='Enter'&&gate&&!gate.hidden&&!gate.classList.contains('is-leaving')){e.preventDefault();enterSite();}});
    $('#loginForm').addEventListener('submit',async e=>{e.preventDefault();if(!db)return;const btn=e.submitter;setButtonBusy(btn,true,'Signing in…');setGlobalBusy(true,'Signing in…');$('#loginMessage').textContent='';try{const {error}=await db.auth.signInWithPassword({email:$('#loginEmail').value.trim(),password:$('#loginPassword').value});if(error)throw error;await refreshAdminUser();if(!state.isEditor){$('#loginMessage').textContent='This account is signed in but does not have editor/admin access.';await db.auth.signOut();await refreshAdminUser();}}catch(err){$('#loginMessage').textContent=err.message||'Sign-in failed.';}finally{setButtonBusy(btn,false);setGlobalBusy(false);}});
    $('#signOutBtn').addEventListener('click',async e=>{const btn=e.currentTarget;setButtonBusy(btn,true,'Signing out…');setGlobalBusy(true,'Signing out…');try{if(db)await db.auth.signOut();state.currentUser=null;state.currentRole='';state.isEditor=false;state.isAdmin=false;updateAdminPane();showToast('Signed out');}finally{setButtonBusy(btn,false);setGlobalBusy(false);}});
    $('#articleForm').addEventListener('submit',handleArticleSubmit);$('#staffForm').addEventListener('submit',handleStaffSubmit);$('#publicationForm').addEventListener('submit',handlePublicationSubmit);$('#achievementForm').addEventListener('submit',handleAchievementSubmit);
    $('#articleReset').addEventListener('click',resetArticleForm);$('#achievementReset').addEventListener('click',resetAchievementForm);$('#coverEditorReset').addEventListener('click',()=>setCoverControls({cover_zoom:1,cover_offset_x:0,cover_offset_y:0,cover_rotation:0,cover_frame:'landscape'}));
    ['#coverZoom','#coverX','#coverY','#coverRotation','#coverFrame'].forEach(sel=>$(sel).addEventListener('input',updateCoverPreview));
    $('#articleCover').addEventListener('change',()=>{const file=$('#articleCover').files[0];if(!file)return;if(coverObjectUrl)URL.revokeObjectURL(coverObjectUrl);coverObjectUrl=URL.createObjectURL(file);$('#articleCoverPreview').src=coverObjectUrl;});
    $$('.admin-tab').forEach(btn=>btn.addEventListener('click',()=>switchAdminTab(btn.dataset.adminTab)));
    window.addEventListener('hashchange',()=>{applyCurrentHash();if(location.hash==='#cms')openCmsDialog().catch(console.error);});$$('#articleDialog,#photoDialog,#adminDialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d)d.close();}));
  }
  function initFormOptions(){
    $('#articleCategory').innerHTML=CATEGORIES.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    const now=new Date();$('#footerYear').textContent=now.getFullYear();
    const weekday=new Intl.DateTimeFormat('en-PH',{weekday:'long'}).format(now);
    const rest=new Intl.DateTimeFormat('en-PH',{month:'long',day:'numeric',year:'numeric'}).format(now);
    const full=`${weekday}, ${rest}`;
    $('#todayLabel').innerHTML=`<span class="date-weekday">${escapeHtml(weekday)}</span><span class="date-rest">${escapeHtml(rest)}</span>`;
    $('#todayLabel').setAttribute('aria-label',full);
    resetArticleForm();
  }
  async function init(){
    initFormOptions();bindEvents();await loadPublicData();openStoryFromUrl();
    if(db){db.auth.onAuthStateChange(()=>{setTimeout(()=>refreshAdminUser().catch(console.error),0);});setTimeout(()=>refreshAdminUser().catch(console.error),0);}
    const wantsCms=new URLSearchParams(location.search).get('cms')==='1'||location.hash==='#cms';
    if(wantsCms)setTimeout(()=>openCmsDialog().catch(console.error),80);
  }
  init().catch(err=>{console.error(err);showToast('The site loaded with an error. Check the browser console.');});
})();
