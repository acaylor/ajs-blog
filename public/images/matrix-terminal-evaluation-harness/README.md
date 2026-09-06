# Matrix evaluation post images

Terminal frames come from the completed 2026-08-17 evaluation, under
`evaluation/report/screenshots/V{11,08,12,13}-ascii.svg`. These render the
preserved anonymous `ascii-final.ansi` frames; they are not new app runs.

- V11: Grok 4.6, OpenCode, 98.5
- V08: GPT-5.6 Sol, OpenCode, 97.5
- V12: DeepSeek V4 Pro, OpenCode, 97.5
- V13: Qwen3.8 Max, OpenCode, 97

Presentation changes: removed the report renderer's rounded corners, window
buttons, and blur; replaced anonymous frame labels with model, agent, and score.
Terminal text and colors are retained. The comparison embeds the same four SVGs.
Font fallback can affect glyph appearance relative to the original terminal.

The agent-comparison chart uses `evaluation/results/FINAL-RESULTS.md`, section
“Track A/B paired comparisons”. Its axis starts at zero. Each pair represents
one frozen run per condition, not an estimate of a stable agent effect.

Scores precede native Mac verification. Grok failed to build there and Qwen Max
had one failing ABI-size test. See the post's native verification section.
