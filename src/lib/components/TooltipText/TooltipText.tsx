import React, { useRef } from 'react';

interface TooltipTextProps {
  children: React.ReactNode;
  text?: string;
  style?: React.CSSProperties;
}

const TooltipText: React.FC<TooltipTextProps> = ({ text, children, style }) => {
  const [show, setShow] = React.useState(false);
  const [positionX, setPositionX] = React.useState({ isLeft: true, position: 0 });
  const anchorRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (anchorRef && anchorRef?.current) {
      const halfWidth = Math.min(document.documentElement.clientWidth, window.innerWidth) * 0.5;
      const anchorRect = anchorRef?.current?.getBoundingClientRect();
      if (e.clientX > halfWidth)
        setPositionX({ isLeft: false, position: anchorRect.width + anchorRect.x - e.clientX });
      else {
        setPositionX({ isLeft: true, position: e.clientX - anchorRect.x });
      }
    }
  };

  if (!text) {
    return <>{children}</>;
  }

  let tooltipClassName = "tooltip-wrapper";
  if (show) {
    tooltipClassName += " tooltip-show";
  }
  return (
    <div
      ref={anchorRef}
      onMouseEnter={() => setShow((true))}
      onMouseLeave={() => setShow((false))}
      onMouseMove={handleMouseMove}
      style={{ width: '100%', height: '100%',display: 'flex', alignItems: 'center'}}
    >
      {children}
      {positionX.isLeft ?
        (
          <div className={tooltipClassName} style={{ ...style, left: positionX.position }}>
            {text}
          </div>
        ) :
        (
          <div className={tooltipClassName} style={{ ...style, right: positionX.position }}>
            {text}
          </div>
        )}
    </div>
  )
};

export default TooltipText;
