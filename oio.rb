class Oio < Formula
  desc "CLI for managing notes and ephemeral shorts with authenticated access"
  homepage "https://github.com/sim4gh/oio-cli"
  url "https://github.com/sim4gh/oio-cli/archive/refs/tags/v1.0.0.tar.gz"
  sha256 "0019dfc4b32d63c1392aa264aed2253c1e0c2fb09216f8e2cc269bbfb8bb49b5"
  license "ISC"

  depends_on "node"

  def install
    # Install dependencies
    system "npm", "install", "--production"

    # Install everything into libexec
    libexec.install Dir["*"]

    # Create wrapper script that calls the CLI
    (bin/"oio").write_env_script("#{libexec}/cli.js", {})
  end

  test do
    assert_match "1.0.0", shell_output("#{bin}/oio --version")
  end
end
