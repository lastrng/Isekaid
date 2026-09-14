function themeVars(C){
  return {
    "--isekaid-bg":C.bg,
    "--isekaid-surface":C.s1,
    "--isekaid-surface-2":C.s2,
    "--isekaid-text":C.text,
    "--isekaid-muted":C.t3,
    "--isekaid-border":C.border,
    "--isekaid-red":C.red,
    "--isekaid-gold":C.gold,
    "--isekaid-shadow":C.shadow,
    "--isekaid-nav-bg":C.navBg,
  };
}

export function productTheme(C,style={}){
  return {...themeVars(C),...style};
}

export function ProductCard({C,as:Tag="div",variant="paper",interactive=false,className="",style={},children,...props}){
  return <Tag className={`isekaid-card isekaid-card--${variant}${interactive?" isekaid-interactive":""}${className?` ${className}`:""}`} style={productTheme(C,style)} {...props}>{children}</Tag>;
}

export function EditorialHeader({C,backLabel,onBack,eyebrow,title,subtitle,leading}){
  return <header className="isekaid-editorial-header" style={productTheme(C)}>
    {onBack&&<button type="button" className="isekaid-editorial-header__back" onClick={onBack}>‹ {backLabel||"Retour"}</button>}
    <div className="isekaid-editorial-header__row">
      {leading&&<span className="isekaid-editorial-header__leading" aria-hidden>{leading}</span>}
      <div><div className="isekaid-eyebrow">{eyebrow}</div><h1 className="isekaid-title">{title}</h1>{subtitle&&<p className="isekaid-subtitle">{subtitle}</p>}</div>
    </div>
  </header>;
}

export function SectionHeading({C,eyebrow,title,detail}){
  return <div className="isekaid-section-heading" style={productTheme(C)}>
    <div><div className="isekaid-eyebrow">{eyebrow}</div><h2>{title}</h2></div>
    {detail&&<span style={{fontSize:10,color:C.t3,textAlign:"right"}}>{detail}</span>}
  </div>;
}

export function EmptyState({C,mark="旅",title,description,actionLabel,onAction,style={}}){
  return <div className="isekaid-empty-state" role="status" style={productTheme(C,style)}>
    <div><span className="isekaid-empty-state__mark" aria-hidden>{mark}</span><strong>{title}</strong>{description&&<p>{description}</p>}{actionLabel&&onAction&&<button type="button" className="isekaid-empty-state__action" onClick={onAction}>{actionLabel}</button>}</div>
  </div>;
}

export function JourneyIllustration({compact=false,className="",style={}}){
  return <div className={`isekaid-journey-art${compact?" isekaid-journey-art--compact":""}${className?` ${className}`:""}`} style={style} aria-hidden="true">
    <img src="/isekaid-journey-art.webp" alt="" decoding="async"/>
  </div>;
}

export function SkeletonBlock({C,width="100%",height=16,style={}}){
  return <span aria-hidden className="isekaid-skeleton" style={productTheme(C,{display:"block",width,height,...style})}/>;
}

export function ScreenSkeleton({C,label="Chargement du contenu"}){
  return <div role="status" aria-label={label} style={productTheme(C,{padding:"54px 20px 24px",display:"grid",gap:14})}>
    <span className="isekaid-visually-hidden">{label}</span>
    <SkeletonBlock C={C} width="34%" height={10}/><SkeletonBlock C={C} width="72%" height={29}/>
    <ProductCard C={C} style={{padding:16,marginTop:8}}><SkeletonBlock C={C} height={120}/><SkeletonBlock C={C} width="56%" height={14} style={{marginTop:14}}/><SkeletonBlock C={C} height={10} style={{marginTop:9}}/><SkeletonBlock C={C} width="84%" height={10} style={{marginTop:7}}/></ProductCard>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><SkeletonBlock C={C} height={84}/><SkeletonBlock C={C} height={84}/></div>
  </div>;
}
