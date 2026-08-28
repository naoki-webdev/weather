import IconButton from "@mui/material/IconButton";
import SvgIcon from "@mui/material/SvgIcon";
import Tooltip from "@mui/material/Tooltip";

type HelpTooltipProps = {
  title: string;
  label: string;
};

export default function HelpTooltip({ title, label }: HelpTooltipProps) {
  return (
    <Tooltip title={title} arrow>
      <IconButton size="small" aria-label={label} sx={{ p: 0.25 }}>
        <SvgIcon fontSize="inherit" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M11 18h2v2h-2v-2Zm1-16a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2 3-2.25 3-5 0-2.21-1.79-4-4-4Z" />
        </SvgIcon>
      </IconButton>
    </Tooltip>
  );
}
