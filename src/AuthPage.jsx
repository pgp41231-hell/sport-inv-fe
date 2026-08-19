import { useEffect, useState } from "react";
import { CircleAlert, KeyRound, LoaderCircle, ShieldCheck, Trophy, UserPlus } from "lucide-react";
import { api } from "./api.js";

export default function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => { api.authConfig().then((response) => setConfig(response.data)).catch(() => {}); }, []);
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault(); setLoading(true); setError(""); setSuccess("");
    try {
      const body = mode === "signup" ? form : { email: form.email, password: form.password };
      const response = mode === "signup" ? await api.signup(body) : await api.login(body);
      if (mode === "signup") {
        setMode("login");
        setForm((current) => ({ name: "", email: current.email, password: "" }));
        setSuccess(response.data.message || "Account created successfully. Sign in to continue.");
      } else onAuthenticated(response.data);
    } catch (requestError) {
      setError(requestError.message);
    } finally { setLoading(false); }
  };

  return (
    <main className="auth-shell">
      <section className="auth-story">
        <div className="auth-brand"><span className="brand-mark"><Trophy size={24} /></span><span><strong>Courtyard</strong><small>IIM Lucknow Sports</small></span></div>
        <div><p className="hero-kicker"><ShieldCheck size={15} />Institute access</p><h1>Your campus.<br /><span>Your game.</span></h1><p>Book facilities, manage equipment, and coordinate sports activities with your IIM Lucknow account.</p></div>
      </section>
      <section className="auth-card-wrap">
        <form className="auth-card" onSubmit={submit}>
          <div className="auth-icon">{mode === "login" ? <KeyRound /> : <UserPlus />}</div>
          <p className="eyebrow">Welcome to Courtyard</p>
          <h2>{mode === "login" ? "Sign in" : "Create your account"}</h2>
          <p className="muted-copy">{mode === "login" ? "Use the credentials you registered with." : "Register using an allowed institute email. We will send a verification link to that inbox before you can sign in."}</p>
          {mode === "signup" && <label className="field">Full name<input required name="name" value={form.name} onChange={update} autoComplete="name" placeholder="Your name" /></label>}
          <label className="field">Institute email<input required type="email" name="email" value={form.email} onChange={update} autoComplete="email" placeholder="pgp12345@iiml.ac.in" /></label>
          <label className="field">Password<input required minLength="8" type="password" name="password" value={form.password} onChange={update} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="At least 8 characters" /></label>
          {error && <p className="form-error"><CircleAlert size={16} />{error}</p>}
          {success && <p className="form-success">{success}</p>}
          <button className="button button-primary button-wide" disabled={loading}>{loading ? <LoaderCircle className="spin" size={18} /> : null}{mode === "login" ? "Sign in" : "Create account"}</button>
          <button type="button" className="auth-switch" onClick={() => { setMode((current) => current === "login" ? "signup" : "login"); setError(""); setSuccess(""); }}>{mode === "login" ? "New here? Create an account" : "Already registered? Sign in"}</button>
          {config && <p className="auth-rule">Allowed email rule: <code>{config.emailPattern}</code><br />Committee admin: {config.bootstrapAdminEmail}</p>}
        </form>
      </section>
    </main>
  );
}
