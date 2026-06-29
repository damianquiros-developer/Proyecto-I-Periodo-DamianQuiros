"""Pruebas funcionales básicas de FIDUCCI."""

import shutil
import tempfile
import unittest
from pathlib import Path

import app as app_module


PROJECT_ROOT = Path(__file__).resolve().parents[1]


class FiducciTestCase(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.database = Path(self.temp_dir.name) / "contactos.xlsx"
        shutil.copy2(PROJECT_ROOT / "contactos.xlsx", self.database)

        self.original_database = app_module.RUTA_BD
        app_module.RUTA_BD = self.database
        app_module.app.config.update(TESTING=True)
        self.client = app_module.app.test_client()

    def tearDown(self):
        app_module.RUTA_BD = self.original_database
        self.temp_dir.cleanup()

    def login(self):
        response = self.client.post(
            "/api/login",
            json={"email": "admin", "password": "1234"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.get_json()["success"])

    def test_paginas_principales_cargan(self):
        routes = [
            "/",
            "/register",
            "/forgot-password",
            "/forgot-success",
            "/dashboard",
            "/perfil",
            "/favoritos",
            "/actividad",
            "/contacto/nuevo",
            "/contacto/detalle",
            "/contacto/editar",
            "/reporte",
        ]
        for route in routes:
            with self.subTest(route=route):
                self.assertEqual(self.client.get(route).status_code, 200)

    def test_autenticacion_y_consultas(self):
        self.assertEqual(self.client.get("/api/contactos").status_code, 401)
        self.login()

        for route in [
            "/api/me",
            "/api/contactos",
            "/api/actividad",
            "/api/reporte",
            "/api/recordatorios",
        ]:
            with self.subTest(route=route):
                response = self.client.get(route)
                self.assertEqual(response.status_code, 200)
                self.assertTrue(response.get_json()["success"])

    def test_ciclo_de_vida_de_contacto(self):
        self.login()
        payload = {
            "nombre": "Prueba",
            "apellido": "Automática",
            "telefono": "88887777",
            "email": "prueba@example.com",
            "notas": "Registro temporal",
            "categoria": "Trabajo",
            "empresa": "FIDUCCI",
            "cargo": "QA",
        }

        created = self.client.post("/api/contactos/nuevo", json=payload)
        self.assertEqual(created.status_code, 201)
        contact_id = created.get_json()["contacto"]["id"]

        favorite = self.client.post(f"/api/contactos/{contact_id}/favorito")
        self.assertEqual(favorite.status_code, 200)
        self.assertTrue(favorite.get_json()["es_favorito"])

        payload["cargo"] = "Control de calidad"
        updated = self.client.put(f"/api/contactos/{contact_id}", json=payload)
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.get_json()["contacto"]["cargo"], "Control de calidad")

        deleted = self.client.delete(f"/api/contactos/{contact_id}")
        self.assertEqual(deleted.status_code, 200)
        self.assertEqual(self.client.get(f"/api/contactos/{contact_id}").status_code, 404)


if __name__ == "__main__":
    unittest.main()
