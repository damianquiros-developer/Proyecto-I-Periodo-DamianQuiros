// Hace funcionar entrar, registrarse rapido y recuperar contrasena.
const BASE_API = "/api";

// Esta pagina tiene tres formularios y aqui se guardan sus campos.

const vistas = {
  login:    document.getElementById("view-login"),
  register: document.getElementById("view-register"),
  forgot:   document.getElementById("view-forgot"),
};

// Login
const correoLogin   = document.getElementById("login-email");
const passLogin     = document.getElementById("login-password");
const errorLogin    = document.getElementById("login-error");
const btnEntrar     = document.getElementById("btn-login");
const recordarme    = document.getElementById("remember-me");

// Registro rapido
const regNombre     = document.getElementById("reg-nombre");
const regApellido   = document.getElementById("reg-apellido");
const regCorreo     = document.getElementById("reg-email");
const regPass       = document.getElementById("reg-password");
const errorRegistro = document.getElementById("register-error");
const exitoRegistro = document.getElementById("register-success");
const btnRegistrar  = document.getElementById("btn-register");

// Recuperar contrasena
const correoOlvide  = document.getElementById("forgot-email");
const exitoOlvide   = document.getElementById("forgot-success");
const errorOlvide   = document.getElementById("forgot-error");
const btnEnviarOlv  = document.getElementById("btn-send-forgot");
const puntos        = document.querySelectorAll('.dot');

// Los puntitos del panel izquierdo muestran en que formulario estamos.

const INDICE_PUNTOS = { login: 1, register: 0, forgot: 2 };

function actualizar_puntos(nombreVista) {
  puntos.forEach((punto, i) => {
    punto.classList.toggle('active', i === INDICE_PUNTOS[nombreVista]);
  });
}

// Cambia entre entrar, registro y recuperar contrasena.
// Tambien acomoda los puntitos del panel izquierdo.

const SLOGANS = {
  login:    "Gestión Profesional<br>de Contactos",
  register: "Únete a FIDUCCI<br>hoy mismo.",
  forgot:   "Recupera tu acceso<br>en segundos.",
};

function mostrar_vista(nombre) {
  Object.entries(vistas).forEach(([clave, el]) => {
    if (el) el.classList.toggle("hidden", clave !== nombre);
  });
  const slogan = document.getElementById("brand-tagline");
  if (slogan) slogan.innerHTML = SLOGANS[nombre] || SLOGANS.login;
  actualizar_puntos(nombre);
  limpiar_alertas();
}

document.getElementById("btn-go-register")?.addEventListener("click", () => mostrar_vista("register"));
document.getElementById("btn-go-login")?.addEventListener("click",    () => mostrar_vista("login"));
document.getElementById("btn-forgot")?.addEventListener("click",      () => mostrar_vista("forgot"));
document.getElementById("btn-back-login")?.addEventListener("click",  () => mostrar_vista("login"));

// Cada ojo junto a un campo de contrasena alterna entre texto y puntos.

document.querySelectorAll(".toggle-pw").forEach(btn => {
  btn.addEventListener("click", () => {
    const campo = document.getElementById(btn.dataset.target);
    if (!campo) return;
    campo.type = campo.type === "password" ? "text" : "password";
    btn.setAttribute("aria-label",
      campo.type === "password" ? "Mostrar contraseña" : "Ocultar contraseña");
  });
});

// Si el usuario marco "recuerdame" antes, su correo aparece listo al abrir la pagina.

const correoGuardado = localStorage.getItem("fiducci_remember");
if (correoGuardado && correoLogin) {
  correoLogin.value  = correoGuardado;
  if (recordarme) recordarme.checked = true;
}

// Cosas pequenas que usan los tres formularios.

function limpiar_alertas() {
  document.querySelectorAll(".alert").forEach(el => el.classList.add("hidden"));
  document.querySelectorAll(".input-error").forEach(el => el.classList.remove("input-error"));
}

function mostrar_error(el, msg) {
  if (!el) return;
  el.querySelector(".alert-text").textContent = msg;
  el.classList.remove("hidden");
}

function set_cargando(btn, cargando) {
  if (!btn) return;
  if (cargando) {
    btn.disabled = true;
    btn.dataset.textoOriginal = btn.textContent;
    btn.innerHTML = `<span class="spinner"></span>Procesando...`;
  } else {
    btn.disabled    = false;
    btn.textContent = btn.dataset.textoOriginal || btn.textContent;
  }
}

function marcar_error(...campos) {
  campos.forEach(c => c && c.classList.add("input-error"));
}

// Esta funcion manda datos a Python y espera la respuesta.

async function api_post(ruta, cuerpo) {
  const res  = await fetch(`${BASE_API}${ruta}`, {
    method:      "POST",
    headers:     { "Content-Type": "application/json" },
    credentials: "include",
    body:        JSON.stringify(cuerpo),
  });
  const datos = await res.json();
  return { ok: res.ok, estado: res.status, datos };
}

// Login: manda usuario y contrasena.
// Si todo esta bien, entra a la pagina principal.

async function manejar_login() {
  limpiar_alertas();

  const correo     = correoLogin.value.trim();
  const contrasena = passLogin.value;

  if (!correo || !contrasena) {
    marcar_error(!correo ? correoLogin : null, !contrasena ? passLogin : null);
    mostrar_error(errorLogin, "Por favor completa todos los campos.");
    return;
  }

  set_cargando(btnEntrar, true);

  try {
    const { ok, datos } = await api_post("/login", { email: correo, password: contrasena });

    if (ok && datos.success) {
      if (recordarme && recordarme.checked) {
        localStorage.setItem("fiducci_remember", correo);
      } else {
        localStorage.removeItem("fiducci_remember");
      }
      sessionStorage.setItem("fiducci_user", JSON.stringify(datos.user));
      window.location.href = "/paginaPrincipal";
    } else {
      marcar_error(correoLogin, passLogin);
      mostrar_error(errorLogin, datos.message || "Credenciales incorrectas.");
    }

  } catch {
    marcar_error(correoLogin, passLogin);
    mostrar_error(errorLogin, "No se pudo conectar al servidor. Verifica que esté activo.");
  } finally {
    set_cargando(btnEntrar, false);
  }
}

btnEntrar?.addEventListener("click", manejar_login);
passLogin?.addEventListener("keydown", e => e.key === "Enter" && manejar_login());

// Crea una cuenta nueva y luego vuelve al inicio.

async function manejar_registro() {
  limpiar_alertas();

  const nombre     = (regNombre?.value    || "").trim();
  const apellido   = (regApellido?.value  || "").trim();
  const correo     = (regCorreo?.value    || "").trim();
  const contrasena =  regPass?.value      || "";

  if (!nombre) {
    marcar_error(regNombre);
    mostrar_error(errorRegistro, "El nombre es requerido.");
    return;
  }
  if (!apellido) {
    marcar_error(regApellido);
    mostrar_error(errorRegistro, "El apellido es requerido.");
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    marcar_error(regCorreo);
    mostrar_error(errorRegistro, "Ingresa un correo electrónico válido.");
    return;
  }
  if (contrasena.length < 8) {
    marcar_error(regPass);
    mostrar_error(errorRegistro, "La contraseña debe tener al menos 8 caracteres.");
    return;
  }

  set_cargando(btnRegistrar, true);

  try {
    const { ok, datos } = await api_post("/register", {
      name:     nombre,
      lastname: apellido,
      email:    correo,
      password: contrasena,
    });

    if (ok && datos.success) {
      if (exitoRegistro) exitoRegistro.classList.remove("hidden");
      [regNombre, regApellido, regCorreo, regPass].forEach(i => { if (i) i.value = ""; });
      setTimeout(() => mostrar_vista("login"), 2000);
    } else {
      mostrar_error(errorRegistro, datos.message || "Error al crear la cuenta.");
    }

  } catch {
    mostrar_error(errorRegistro, "No se pudo conectar al servidor. Intenta más tarde.");
  } finally {
    set_cargando(btnRegistrar, false);
  }
}

btnRegistrar?.addEventListener("click", manejar_registro);

// Pide recuperar contrasena y muestra un mensaje normal.

async function manejar_olvide() {
  limpiar_alertas();

  const correo = (correoOlvide?.value || "").trim();

  if (!correo) {
    marcar_error(correoOlvide);
    mostrar_error(errorOlvide, "Por favor ingresa tu correo electrónico.");
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    marcar_error(correoOlvide);
    mostrar_error(errorOlvide, "Ingresa un correo electrónico válido.");
    return;
  }

  set_cargando(btnEnviarOlv, true);

  try {
    const { datos } = await api_post("/forgot-password", { email: correo });
    if (exitoOlvide) {
      exitoOlvide.querySelector(".alert-text").textContent =
        datos.message || "Si el email existe, recibirás instrucciones pronto.";
      exitoOlvide.classList.remove("hidden");
    }
    if (correoOlvide) correoOlvide.value = "";

  } catch {
    if (exitoOlvide) {
      exitoOlvide.querySelector(".alert-text").textContent =
        "Si el email existe, recibirás instrucciones pronto.";
      exitoOlvide.classList.remove("hidden");
    }
  } finally {
    set_cargando(btnEnviarOlv, false);
  }
}

btnEnviarOlv?.addEventListener("click", manejar_olvide);
correoOlvide?.addEventListener("keydown", e => e.key === "Enter" && manejar_olvide());
