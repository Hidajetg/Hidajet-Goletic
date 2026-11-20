#!/usr/bin/env python3
"""Add best-effort iOS screen-recording and app-switcher privacy to a generated
Capacitor 8 UIScene project. Not a screenshot-blocker: iOS has no supported
per-app API for preventing a normal single-frame screenshot.

The generated SceneDelegate.swift file is modified in CI before Xcode compiles.
No web app or production file is touched.
"""
from pathlib import Path

scene_file = Path(__file__).resolve().parents[1] / "ios" / "App" / "App" / "SceneDelegate.swift"
source = scene_file.read_text(encoding="utf-8")

marker = "SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)"
if source.count(marker) != 1:
    raise SystemExit("Capacitor SceneDelegate template changed; refusing unsafe privacy patch.")
if "solstonePrivacyWindow" in source:
    raise SystemExit("Privacy patch already applied.")
if not source.rstrip().endswith("}"):
    raise SystemExit("Unexpected Swift class ending.")

source = source.replace(
    marker,
    marker + "\n        installSolstonePrivacyShield(scene)"
)
location = source.rfind("\n}")
assert location > 0

extension = """
    // iOS cannot block still screenshots via a public per-app API.
    // A separate black native UIWindow covers content while recording,
    // mirroring or screen sharing is detected, and in app-switcher previews.
    private var solstonePrivacyWindow: UIWindow?
    private var solstoneSceneIsActive = false

    private func installSolstonePrivacyShield(_ scene: UIScene) {
        guard let windowScene = scene as? UIWindowScene else { return }

        let shield = UIWindow(windowScene: windowScene)
        shield.windowLevel = UIWindow.Level.alert + 1
        shield.backgroundColor = UIColor.black

        let controller = UIViewController()
        controller.view.backgroundColor = UIColor(red: 0.05, green: 0.06, blue: 0.08, alpha: 1)
        let label = UILabel()
        label.text = "Solstone • Screen protected"
        label.textColor = UIColor.white
        label.font = UIFont.systemFont(ofSize: 18, weight: .semibold)
        label.textAlignment = .center
        label.numberOfLines = 2
        label.translatesAutoresizingMaskIntoConstraints = false
        controller.view.addSubview(label)
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: controller.view.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: controller.view.centerYAnchor),
            label.leadingAnchor.constraint(greaterThanOrEqualTo: controller.view.leadingAnchor, constant: 20),
            label.trailingAnchor.constraint(lessThanOrEqualTo: controller.view.trailingAnchor, constant: -20)
        ])
        shield.rootViewController = controller
        // Never make the overlay a key window; preserve WebView keyboard focus.
        shield.isHidden = false
        solstonePrivacyWindow = shield

        NotificationCenter.default.addObserver(
            self, selector: #selector(solstoneSceneDeactivated(_:)),
            name: UIScene.willDeactivateNotification, object: windowScene
        )
        NotificationCenter.default.addObserver(
            self, selector: #selector(solstoneSceneActivated(_:)),
            name: UIScene.didActivateNotification, object: windowScene
        )
        NotificationCenter.default.addObserver(
            self, selector: #selector(solstoneCaptureChanged(_:)),
            name: UIScreen.capturedDidChangeNotification, object: nil
        )
        updateSolstonePrivacy()
    }

    @objc private func solstoneSceneDeactivated(_ notification: Notification) {
        solstoneSceneIsActive = false
        updateSolstonePrivacy()
    }

    @objc private func solstoneSceneActivated(_ notification: Notification) {
        solstoneSceneIsActive = true
        updateSolstonePrivacy()
    }

    @objc private func solstoneCaptureChanged(_ notification: Notification) {
        updateSolstonePrivacy()
    }

    private func updateSolstonePrivacy() {
        guard let shield = solstonePrivacyWindow else { return }
        // Still screenshots are captured before UIKit's notification is sent.
        // This only redacts content while continuous capture is detected.
        let captureActive = shield.windowScene?.screen.isCaptured ?? false
        shield.isHidden = solstoneSceneIsActive && !captureActive
    }
"""
source = source[:location] + "\n" + extension + source[location:]
scene_file.write_text(source, encoding="utf-8")
print("Installed best-effort native iOS recording/app-switcher privacy overlay.")
