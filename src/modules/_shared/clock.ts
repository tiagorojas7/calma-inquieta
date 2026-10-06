/** Port for the current instant. Implementations live outside the kernel. */
export interface Clock {
  now(): Date;
}
