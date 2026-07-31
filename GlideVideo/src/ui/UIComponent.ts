// src/ui/UIComponent.ts

export abstract class UIComponent<T extends HTMLElement = HTMLDivElement> {
	protected element!: T;

	/**
	 * Getter for the root DOM element of the component.
	 */
	public get dom(): T {
		return this.element;
	}

	/**
	 * Builds and returns the component's root DOM element.
	 * Must be implemented by concrete UI components.
	 */
	protected abstract render(): T;

	/**
	 * Default no-op update method to refresh/sync the component's visual state.
	 * Can be overridden by subclasses.
	 */
	public update(): void {}
}
