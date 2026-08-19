-- Keymaps are automatically loaded on the VeryLazy event
-- Default keymaps that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/keymaps.lua
-- Add any additional keymaps here

-- Open Telescope command palette with Cmd+Shift+P
vim.keymap.set("n", "<D-S-p>", "<cmd>Telescope commands<cr>", { desc = "Command Palette" })
