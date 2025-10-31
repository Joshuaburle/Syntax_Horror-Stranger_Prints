#!/usr/bin/env python3

import tkinter as tk
from functools import partial
import os
try:
    from PIL import Image, ImageTk
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

def on_closing():
    text_var.set("> Vous ne pouvez pas quitter comme ça...")
    root.bell()  # Fait un son pour l'effet

STORY = {
    "start": {
        "text": """Jean-Michel Pointeur (v1.0)
Bonjour 😊
Je suis Jean-Michel Pointeur, ton tuteur personnel pour comprendre simplement les pointeurs en C.
Ensemble, on va voir ce qu'est une adresse, comment lire et modifier une valeur via un pointeur, et adopter de bons réflexes de sécurité. Youpi !

Prends ton temps, réponds à ton rythme : je t'explique tout pas à pas.

Appuie sur ENTER pour commencer.""",
        "choices": [("Commencer", "enter_name")]
    },

    "enter_name": {
        "text": """Bienvenue dans cette aventure interactive !
Comment t'appelles-tu ?

Entrez votre nom :""",
        "choices": [("Valider", "first_question")]
    },

    "first_question": {
        "text": """L'adresse de variable, operateur&   
Une variable en C a une adresse en mémoire. Pour obtenir cette adresse, on utilise l'opérateur &.
Selon toi que represente &n ?""",
        "choices": [
            ("L'adresse de la variable n", "second_question"),
            ("La valeur de la variable n", "cas_erreur")
        ]
    },

    "second_question": {
        "text": """Déréferencer un pointeur, c'est accéder à la valeur stockée à l'adresse pointée. On utilise l'opérateur * pour cela.
Que fait l'expression *p si p est un pointeur vers un entier ?""",
        "choices": [
            ("Accède à la valeur entière pointée par p", "third_question"),
            ("Accède à l'adresse de p", "cas_erreur")
        ]
    },

    "third_question": {
        "text": """Q3 — Comprendre l'envers.
Que fait l'expression &*p si p est un pointeur valide ?""",
        "choices": [
            ("Retourne la valeur stockée à l'adresse de p", "jean_michel_enerve"),
            ("Retourne l'adresse pointée par p", "strange_question")
        ]
    },

    "cas_erreur": {
        "text": """Oups ! Non, il semble que tu te sois trompé. Reprenons ensemble pour bien comprendre.""",
        "choices": [("Recommencer", "first_question")]
    },

    "jean_michel_enerve": {
        "text": """Jean-Michel Pointeur (v1.1)
Ça suffit les erreurs ! On va tout reprendre depuis le début.
Cette fois, tu vas écouter attentivement et suivre mes instructions à la lettre. Pas de place pour l'erreur cette fois-ci !""",
        "choices": [("Recommencer", "first_question")]
    },

    "strange_question": {
        "text": """Si tu ne pouvais sauver qu'une personne, tu choisirais de sauver :""",
        "choices": [
            ("Un(e) ami(e)", "end"),
            ("Un(e) membre de ta famille", "end")
        ]
    },

    "end": {
        "text": "Merci d'avoir participé !",
        "choices": []
    }
}

root = tk.Tk()
root.title("Terminal")
root.geometry("600x400")
root.configure(bg='black')
root.protocol("WM_DELETE_WINDOW", on_closing)  # Intercepte la croix

# Frame pour l'image dans le coin
image_frame = tk.Frame(root, bg='black')
image_frame.place(x=10, y=10)  # Position fixe dans le coin

# Chargement et affichage de l'image
if HAS_PIL:
    try:
        # Chemin absolu de l'image (dans le dossier images à côté du script)
        script_dir = os.path.dirname(os.path.abspath(__file__))
        image_path = os.path.join(script_dir, "images", "corner_image.png")

        # Charger l'image
        image = Image.open(image_path)

        # Choisir l'algorithme de redimensionnement compatible selon la version de Pillow
        try:
            resample_algo = Image.Resampling.LANCZOS  # Pillow >= 9.1
        except AttributeError:
            # Fallback pour anciennes versions de Pillow
            resample_algo = getattr(Image, "LANCZOS", getattr(Image, "ANTIALIAS", 0))

        # Redimensionner l'image (ajustez la taille selon vos besoins)
        image = image.resize((80, 80), resample=resample_algo)
        photo = ImageTk.PhotoImage(image)

        # Créer le label avec l'image
        image_label = tk.Label(
            image_frame,
            image=photo,
            bg='black',
            bd=0  # Pas de bordure
        )
        # Conserver une référence pour éviter le garbage collection
        image_label.image = photo
        image_label.pack()

    except Exception as e:
        print(f"Erreur de chargement de l'image: {e}")
        print(f"Chemin testé: {locals().get('image_path', 'inconnu')}")
        # Placeholder en cas d'erreur
        placeholder = tk.Label(
            image_frame,
            text="[×]",  # Symbole simple
            bg='black',
            fg='#00ff00',
            font=('Courier', 14)
        )
        placeholder.pack()
else:
    print("PIL non installé - fonctionnement sans images")

# Style terminal (texte)
text_var = tk.StringVar()
text_label = tk.Label(
    root, 
    textvariable=text_var, 
    wraplength=540,
    justify="left",
    padx=20,
    pady=20,
    bg='black',
    fg='#00ff00',
    font=('Courier', 12)
)
text_label.pack(fill="both", expand=True)
# S'assurer que l'image reste au-dessus du texte
image_frame.lift()

# Frame pour les boutons
btn_frame = tk.Frame(root, bg='black')
btn_frame.pack(pady=8)

def show(node_id):
    node = STORY[node_id]
    text_var.set(node["text"])
    for w in btn_frame.winfo_children():
        w.destroy()
    if node["choices"]:
        for label, next_id in node["choices"]:
            btn = tk.Button(
                btn_frame,
                text=f"> {label}",
                width=30,
                command=partial(show, next_id),
                bg='black',
                fg='#00ff00',
                activebackground='#003300',
                activeforeground='#00ff00',
                font=('Courier', 10),
                relief='flat',
                borderwidth=0,
                cursor='hand2'
            )
            btn.pack(pady=2)
    else:
        tk.Button(
            btn_frame,
            text="> Quitter",
            width=30,
            command=root.destroy,
            bg='black',
            fg='#00ff00',
            activebackground='#003300',
            activeforeground='#00ff00',
            font=('Courier', 10),
            relief='flat',
            borderwidth=0,
            cursor='hand2'
        ).pack(pady=4)

# Démarrer avec la première scène
show("start")

# Lancer la boucle principale
# Remonter l'image encore une fois après la mise en page initiale
root.after(0, image_frame.lift)
root.mainloop()
