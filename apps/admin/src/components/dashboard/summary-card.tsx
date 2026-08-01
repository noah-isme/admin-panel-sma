import React from "react";
import { Box, Button, Paper, Skeleton, Stack, Typography, alpha, useTheme } from "@mui/material";

export type SummaryCardProps = {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon: React.ReactElement;
  accentColor: string;
  loading?: boolean;
  ctaLabel?: string;
  onCta?: () => void;
};

export const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  accentColor,
  loading,
  ctaLabel = "Lihat detail",
  onCta,
}) => {
  const theme = useTheme();
  const iconElement = React.cloneElement(icon, {
    size: 20,
    color: accentColor,
    "aria-hidden": "true",
    focusable: "false",
  });

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        height: "100%",
        borderRadius: 1.5,
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "none",
        transition: "border-color 0.15s ease-in-out",
        "&:hover": {
          borderColor:
            theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.24)" : "rgba(0, 0, 0, 0.24)",
        },
      }}
      role="group"
      aria-busy={loading ? "true" : undefined}
    >
      <Stack spacing={2} alignItems="flex-start" sx={{ height: "100%" }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ width: "100%" }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: alpha(accentColor, theme.palette.mode === "dark" ? 0.16 : 0.08),
              border: `1px solid ${alpha(accentColor, 0.2)}`,
            }}
            aria-label={`Ikon ${title}`}
          >
            {iconElement}
          </Box>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{
              fontWeight: 600,
              fontSize: "0.8125rem",
              letterSpacing: "0.01em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </Typography>
        </Stack>

        <Box sx={{ width: "100%" }}>
          {loading ? (
            <Skeleton variant="text" width={120} height={36} />
          ) : (
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                fontSize: "1.75rem",
                letterSpacing: "-0.02em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                lineHeight: 1.2,
              }}
            >
              {value}
            </Typography>
          )}
        </Box>

        {subtitle ? (
          loading ? (
            <Skeleton variant="text" width={180} />
          ) : (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontSize: "0.8125rem",
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                wordBreak: "break-word",
              }}
            >
              {subtitle}
            </Typography>
          )
        ) : null}

        <Box sx={{ flexGrow: 1 }} />

        <Button
          variant="text"
          color="primary"
          onClick={onCta}
          disabled={!onCta}
          aria-label={`${ctaLabel} untuk ${title}`}
          sx={{
            fontWeight: 600,
            fontSize: "0.8125rem",
            alignSelf: "flex-start",
            px: 0,
            py: 0,
            minWidth: 0,
            "&:hover": {
              backgroundColor: "transparent",
              textDecoration: "underline",
            },
          }}
        >
          {ctaLabel}
        </Button>
      </Stack>
    </Paper>
  );
};
