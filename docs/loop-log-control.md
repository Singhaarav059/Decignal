# Loop log: 06 Human control

Iter 1 (capture): widget worked but Approve jumped straight to text; card width changed between states (447 to 584px at 1440); tablet 768 card stack sat behind the widget.
Iter 1 (build): Approve now shows an "Example plan" strip: decision chip travels down into the slot (--dur-4), plan track fills (--dur-5), check pops (--dur-2 overshoot), then the result text reveals. Quantities use rolling digits (--dur-3) in title, header and stock balance. Result/reject states fade in (--dur-3). Reduced motion: all animation off, instant state. Card width fixed at 28rem.
Iter 2: phone plan strip compacted to one row; tablet-only TABLET_DROP[5]=0.3 in Scene.tsx moves the stack below the widget.
Verify: no console errors, scrollWidth == viewport at all widths, tsc clean, eslint baseline (2 errors, 6 warnings). CLS at 390 (~0.23) comes only from scripted clicks (no hadRecentInput); real clicks exclude it.
Scores (1440/768/390): clarity 9/9/8, hierarchy 8/8/8, polish 9/8/8, motion meaning 9/9/9, cohesion 9/9/8, performance 9/9/9.
Open: approved state on phone covers the stack (card grows upward); ERP wording proposal in copy-proposals.md.
