{ pkgs, ... }: {
  channel = "stable-25.05";
  # Use https://search.nixos.org/packages to find packages
  packages = [
    pkgs.nodejs_22
    pkgs.bun
  ];
  env = {};
  idx = {
    extensions = [
      "google.gemini-cli-vscode-ide-companion"
      "vitest.explorer"
    ];
    workspace = {
      onCreate = {
        bun-i = "bun i";
      };
      onStart = {};
    };
  };
}
