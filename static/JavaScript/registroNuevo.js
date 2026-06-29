// Hace funcionar el registro de usuario.
const BASE_API = "/api";

// Aqui se guardan los campos que usa el registro.

const campoNombre    = document.getElementById("reg-nombre");
const campoApellido  = document.getElementById("reg-apellido");
const campoCorreo    = document.getElementById("reg-email");
const campoPass      = document.getElementById("reg-password");
const campoConfirmar = document.getElementById("reg-confirm");
const campoTerminos  = document.getElementById("terms");
const btnRegistrar   = document.getElementById("btn-register");
const alertaError    = document.getElementById("register-error");
const barraFuerza    = document.getElementById("strength-fill");
const textoFuerza    = document.getElementById("strength-text");

// El ojo deja ver u ocultar la contrasena.

document.querySelectorAll(".toggle-pw").forEach(btn => {
  btn.addEventListener("click", () => {
    const campo = document.getElementById(btn.dataset.target);
    campo.type  = campo.type === "password" ? "text" : "password";
  });
});

// La barra cambia segun que tan fuerte va la contrasena.

function calcular_fuerza(pw) {
  let puntos = 0;
  if (pw.length >= 8)           puntos++;
  if (pw.length >= 12)          puntos++;
  if (/[A-Z]/.test(pw))         puntos++;
  if (/[0-9]/.test(pw))         puntos++;
  if (/[^A-Za-z0-9]/.test(pw)) puntos++;
  return puntos;
}

campoPass.addEventListener("input", () => {
  const pw     = campoPass.value;
  const puntos = calcular_fuerza(pw);

  barraFuerza.className = "strength-fill";
  textoFuerza.className = "";

  if (!pw) {
    barraFuerza.style.width = "0";
    textoFuerza.textContent = "—";
    return;
  }

  if (puntos <= 1) {
    barraFuerza.classList.add("debil");
    textoFuerza.classList.add("strength-text-debil");
    textoFuerza.textContent = "Débil";
  } else if (puntos === 2) {
    barraFuerza.classList.add("regular");
    textoFuerza.classList.add("strength-text-regular");
    textoFuerza.textContent = "Regular";
  } else if (puntos === 3) {
    barraFuerza.classList.add("buena");
    textoFuerza.classList.add("strength-text-buena");
    textoFuerza.textContent = "Buena";
  } else {
    barraFuerza.classList.add("fuerte");
    textoFuerza.classList.add("strength-text-fuerte");
    textoFuerza.textContent = "Fuerte";
  }
});

// Cosas pequenas para mostrar errores y limpiar la pantalla.

function mostrar_error(msg) {
  alertaError.querySelector(".alert-text").textContent = msg;
  alertaError.classList.remove("hidden");
}

function limpiar_error() {
  alertaError.classList.add("hidden");
  document.querySelectorAll(".input-error").forEach(el => el.classList.remove("input-error"));
}

function marcar_error(...campos) {
  campos.forEach(c => c && c.classList.add("input-error"));
}

function set_cargando(cargando) {
  btnRegistrar.disabled  = cargando;
  btnRegistrar.innerHTML = cargando
    ? `<span class="spinner"></span>Creando cuenta...`
    : "Crear cuenta";
}

// Revisa que no falte nada antes de crear la cuenta.

function validar() {
  limpiar_error();

  if (!campoNombre.value.trim()) {
    marcar_error(campoNombre);
    mostrar_error("El nombre es requerido.");
    return false;
  }

  if (!campoApellido.value.trim()) {
    marcar_error(campoApellido);
    mostrar_error("El apellido es requerido.");
    return false;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campoCorreo.value.trim())) {
    marcar_error(campoCorreo);
    mostrar_error("Ingresa un correo electrónico válido.");
    return false;
  }

  if (campoPass.value.length < 8) {
    marcar_error(campoPass);
    mostrar_error("La contraseña debe tener al menos 8 caracteres.");
    return false;
  }

  if (campoPass.value !== campoConfirmar.value) {
    marcar_error(campoConfirmar);
    mostrar_error("Las contraseñas no coinciden.");
    return false;
  }

  if (!campoTerminos.checked) {
    mostrar_error("Debes aceptar los Términos de Uso y Política de Privacidad.");
    return false;
  }

  return true;
}

// Si todo esta bien, crea la cuenta y vuelve al inicio.

async function manejar_registro() {
  if (!validar()) return;

  set_cargando(true);

  const cuerpo = {
    name:     campoNombre.value.trim(),
    lastname: campoApellido.value.trim(),
    email:    campoCorreo.value.trim().toLowerCase(),
    password: campoPass.value,
  };

  try {
    const res  = await fetch(`${BASE_API}/register`, {
      method:      "POST",
      headers:     { "Content-Type": "application/json" },
      credentials: "include",
      body:        JSON.stringify(cuerpo),
    });
    const datos = await res.json();

    if (res.ok && datos.success) {
      window.location.href = "/?registered=1";
    } else {
      mostrar_error(datos.message || "Error al crear la cuenta.");
    }

  } catch {
    mostrar_error("No se pudo conectar al servidor. Intenta más tarde.");
  } finally {
    set_cargando(false);
  }
}

btnRegistrar.addEventListener("click", manejar_registro);
campoConfirmar.addEventListener("keydown", e => e.key === "Enter" && manejar_registro());
