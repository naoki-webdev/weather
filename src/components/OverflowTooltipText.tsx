import { memo, useEffect, useRef, useState } from "react";

import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import type { SxProps, Theme } from "@mui/material/styles";

type OverflowTooltipTextProps = {
  text: string;
  sx?: SxProps<Theme>;
};

function OverflowTooltipText({ text, sx }: OverflowTooltipTextProps) {
  const textRef = useRef<HTMLSpanElement | null>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;

    const updateOverflow = () => {
      setIsOverflowing(element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight);
    };

    updateOverflow();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateOverflow);

      return () => {
        window.removeEventListener("resize", updateOverflow);
      };
    }

    const observer = new ResizeObserver(() => {
      updateOverflow();
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [text]);

  return (
    <Tooltip arrow title={text} disableHoverListener={!text.trim() || !isOverflowing}>
      <Box
        component="span"
        ref={textRef}
        sx={{
          display: "block",
          width: "100%",
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          ...sx,
        }}
      >
        {text}
      </Box>
    </Tooltip>
  );
}

export default memo(OverflowTooltipText);
