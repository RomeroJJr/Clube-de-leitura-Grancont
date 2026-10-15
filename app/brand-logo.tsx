'use client';
import {useId} from 'react';

/** Preserve the supplied logo geometry while displaying only its white ink. */
export default function BrandLogo(){
 const id=useId().replace(/:/g,'');
 const filterId=`grancont-white-${id}`,titleId=`grancont-title-${id}`;
 return <svg className="brand-mark" viewBox="68 330 1836 452" width="220" height="54" role="img" aria-labelledby={titleId}>
  <title id={titleId}>Grancont Soluções Contábeis</title>
  <defs><filter id={filterId} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
   <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 1.25 0 0 -0.25"/>
  </filter></defs>
  <image href="/brand/grancont.jpg" width="2048" height="1024" filter={`url(#${filterId})`}/>
 </svg>;
}
